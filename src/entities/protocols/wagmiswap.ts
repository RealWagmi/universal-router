import { CurrencyAmount, Percent, TradeType, validateAndParseAddress } from '@real-wagmi/sdk';
import { Command, RouterTradeType } from '../command';
import { RouteType, SmartRouter, SmartRouterTrade } from '@real-wagmi/smart-router';
import { SwapOptions } from '../types';
import { ABIParametersType, CommandType, RoutePlanner } from '../../utils';
import invariant from 'tiny-invariant';
import { ROUTER_AS_RECIPIENT, SENDER_AS_RECIPIENT } from '../../constants';
import { encodeFeeBips } from '../../utils/numbers';

export class WagmiTrade implements Command {
    readonly tradeType: RouterTradeType = RouterTradeType.UniswapTrade;

    readonly type: TradeType;

    constructor(public trade: Omit<SmartRouterTrade<TradeType>, 'gasEstimate'>, public options: SwapOptions) {
        this.type = this.trade.tradeType;
        if (options.fee && options.flatFee) {
            throw new Error('Cannot specify both fee and flatFee');
        }
    }

    public encode(planner: RoutePlanner): void {
        let payerIsUser = !this.options.payerIsRouter;

        // If the input currency is the native currency, we need to wrap it with the router as the recipient
        if (this.trade.inputAmount.currency.isNative) {
            planner.addCommand(CommandType.WRAP_ETH, [
                ROUTER_AS_RECIPIENT,
                SmartRouter.maximumAmountIn(this.trade, this.options.slippageTolerance, this.trade.inputAmount).quotient,
            ]);
            // since WETH is now owned by the router, the router pays for inputs
            payerIsUser = false;
        }

        // The overall recipient at the end of the trade, SENDER_AS_RECIPIENT uses the msg.sender
        this.options.recipient = this.options.recipient ?? SENDER_AS_RECIPIENT;

        // flag for whether we want to perform slippage check on aggregate output of multiple routes
        //   1. when there are >2 exact input trades. this is only a heuristic,
        //      as it's still more gas-expensive even in this case, but has benefits
        //      in that the reversion probability is lower
        const inputIsNative = this.trade.inputAmount.currency.isNative;
        const outputIsNative = this.trade.outputAmount.currency.isNative;
        const performAggregatedSlippageCheck = this.trade.tradeType === TradeType.EXACT_INPUT && this.trade.routes.length > 2;
        const routerMustCustody = performAggregatedSlippageCheck || outputIsNative || hasFeeOption(this.options);

        for (const route of this.trade.routes) {
            const singleRouteTrade: Omit<SmartRouterTrade<TradeType>, 'gasEstimate'> = {
                ...this.trade,
                routes: [route],
                inputAmount: route.inputAmount,
                outputAmount: route.outputAmount,
            };
            if (route.type === RouteType.V3) {
                addV3Swap(planner, singleRouteTrade, this.options, routerMustCustody, payerIsUser);
                continue;
            }
            throw new Error('Unsupported route type');
        }

        let minAmountOut = SmartRouter.minimumAmountOut(this.trade, this.options.slippageTolerance, this.trade.outputAmount);

        // The router custodies for 3 reasons: to unwrap, to take a fee, and/or to do a slippage check
        if (routerMustCustody) {
            // If there is a fee, that percentage is sent to the fee recipient
            // In the case where ETH is the output currency, the fee is taken in WETH (for gas reasons)
            if (this.options.fee) {
                const feeBips = encodeFeeBips(this.options.fee.fee);
                planner.addCommand(CommandType.PAY_PORTION, [this.trade.outputAmount.currency.wrapped.address, this.options.fee.recipient, feeBips]);

                // If the trade is exact output, and a fee was taken, we must adjust the amount out to be the amount after the fee
                // Otherwise we continue as expected with the trade's normal expected output
                if (this.type === TradeType.EXACT_OUTPUT) {
                    minAmountOut = minAmountOut.subtract(minAmountOut.multiply(feeBips).divide(10_000));
                }
            }

            // TODO: missing flatFee
            if (this.options.flatFee) {
                const fee = BigInt(this.options.flatFee.amount.toString());
                if (fee < minAmountOut.quotient) throw new Error("Flat fee can't be greater than minimum amount out");

                planner.addCommand(CommandType.TRANSFER, [this.trade.outputAmount.currency.wrapped.address, this.options.flatFee.recipient, fee]);

                // If the trade is exact output, and a fee was taken, we must adjust the amount out to be the amount after the fee
                // Otherwise we continue as expected with the trade's normal expected output
                if (this.type === TradeType.EXACT_OUTPUT) {
                    minAmountOut = CurrencyAmount.fromRawAmount(this.trade.outputAmount.currency, minAmountOut.quotient - fee);
                }
            }

            // The remaining tokens that need to be sent to the user after the fee is taken will be caught
            // by this if-else clause.
            if (outputIsNative) {
                planner.addCommand(CommandType.UNWRAP_WETH, [this.options.recipient, minAmountOut.quotient]);
            } else {
                planner.addCommand(CommandType.SWEEP, [this.trade.outputAmount.currency.wrapped.address, this.options.recipient, minAmountOut.quotient]);
            }
        }

        if (inputIsNative && (this.type === TradeType.EXACT_OUTPUT || riskOfPartialFill(this.trade))) {
            // for exactOutput swaps that take native currency as input
            // we need to send back the change to the user
            planner.addCommand(CommandType.UNWRAP_WETH, [this.options.recipient, 0n]);
        }
    }
}

// encode a v3 swap
function addV3Swap(planner: RoutePlanner, trade: Omit<SmartRouterTrade<TradeType>, 'gasEstimate'>, options: SwapOptions, routerMustCustody: boolean, payerIsUser: boolean): void {
    invariant(trade.routes.length === 1 && trade.routes[0].type === RouteType.V3, 'Only allow single route v3 trade');
    const [route] = trade.routes;

    const { inputAmount, outputAmount } = route;

    // we need to generaate v3 path as a hash string. we can still use encodeMixedRoute
    // as a v3 swap is essentially a for of mixedRoute
    const path = SmartRouter.encodeMixedRouteToPath({ ...route, input: inputAmount.currency, output: outputAmount.currency }, trade.tradeType === TradeType.EXACT_OUTPUT);
    const amountIn: bigint = SmartRouter.maximumAmountIn(trade, options.slippageTolerance, inputAmount).quotient;
    const amountOut: bigint = SmartRouter.minimumAmountOut(trade, options.slippageTolerance, outputAmount).quotient;

    const recipient = routerMustCustody ? ROUTER_AS_RECIPIENT : validateAndParseAddress(options.recipient ?? SENDER_AS_RECIPIENT);

    if (trade.tradeType === TradeType.EXACT_INPUT) {
        const exactInputSingleParams: ABIParametersType<CommandType.V3_SWAP_EXACT_IN> = [recipient, amountIn, amountOut, path, payerIsUser];
        planner.addCommand(CommandType.V3_SWAP_EXACT_IN, exactInputSingleParams);
        return;
    }

    const exactOutputSingleParams: ABIParametersType<CommandType.V3_SWAP_EXACT_OUT> = [recipient, amountOut, amountIn, path, payerIsUser];
    planner.addCommand(CommandType.V3_SWAP_EXACT_OUT, exactOutputSingleParams);
}

const REFUND_ETH_PRICE_IMPACT_THRESHOLD = new Percent(50, 100);

// if price impact is very high, there's a chance of hitting max/min prices resulting in a partial fill of the swap
function riskOfPartialFill(trade: Omit<SmartRouterTrade<TradeType>, 'gasEstimate'>): boolean {
    return SmartRouter.getPriceImpact(trade).greaterThan(REFUND_ETH_PRICE_IMPACT_THRESHOLD);
}

function hasFeeOption(swapOptions: SwapOptions): boolean {
    return !!swapOptions.fee || !!swapOptions.flatFee;
}
