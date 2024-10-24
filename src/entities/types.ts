import { PermitSingle } from '@real-wagmi/permit2-sdk';
import { BigintIsh } from '@real-wagmi/sdk';
import { Address } from 'viem';
import { SwapOptions as RouterSwapOptions } from '@real-wagmi/smart-router'

export interface Permit2Signature extends PermitSingle {
    signature: `0x${string}`;
}

export type FlatFeeOptions = {
    amount: BigintIsh;
    recipient: Address;
}

export type SwapOptions = Omit<RouterSwapOptions, 'inputTokenPermit'> & {
    inputTokenPermit?: Permit2Signature;
    payerIsRouter?: boolean;
    flatFee?: FlatFeeOptions;
};

export type SwapRouterConfig = {
    sender?: Address;
    deadline?: BigintIsh;
  }