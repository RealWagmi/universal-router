import invariant from 'tiny-invariant';
import type { Address } from 'viem';
import { ROUTER_AS_RECIPIENT } from '../constants';
import { Permit2Signature } from '../entities/types';
import { CommandType, RoutePlanner } from './routerCommands';

export type ApproveProtocol = {
    token: string;
    protocol: string;
};

export type Permit2TransferFrom = {
    token: string;
    amount: string;
    recipient?: string;
};

export type InputTokenOptions = {
    approval?: ApproveProtocol;
    permit2Permit?: Permit2Signature;
    permit2TransferFrom?: Permit2TransferFrom;
};

export function encodePermit(planner: RoutePlanner, permit2: Permit2Signature): void {
    planner.addCommand(CommandType.PERMIT2_PERMIT, [permit2 as any, permit2.signature])
}

// Handles the encoding of commands needed to gather input tokens for a trade
// Approval: The router approving another address to take tokens.
//   note: Only seaport and sudoswap support this action. Approvals are left open.
// Permit: A Permit2 signature-based Permit to allow the router to access a user's tokens
// Transfer: A Permit2 TransferFrom of tokens from a user to either the router or another address
export function encodeInputTokenOptions(planner: RoutePlanner, options: InputTokenOptions) {
    // first ensure that all tokens provided for encoding are the same
    if (!!options.approval && !!options.permit2Permit) invariant(options.approval.token === options.permit2Permit.details.token, `inconsistent token`);
    if (!!options.approval && !!options.permit2TransferFrom) invariant(options.approval.token === options.permit2TransferFrom.token, `inconsistent token`);
    if (!!options.permit2TransferFrom && !!options.permit2Permit) invariant(options.permit2TransferFrom.token === options.permit2Permit.details.token, `inconsistent token`);

    // if an options.approval is required, add it
    // if (options.approval) {
    //     planner.addCommand(CommandType.APPROVE_ERC20, [options.approval.token, mapApprovalProtocol(options.approval.protocol)]);
    // }

    // if this order has a options.permit2Permit, encode it
    if (options.permit2Permit) {
        encodePermit(planner, options.permit2Permit);
    }

    if (options.permit2TransferFrom) {
        planner.addCommand(CommandType.PERMIT2_TRANSFER_FROM, [
            options.permit2TransferFrom.token as Address,
            (options.permit2TransferFrom.recipient ? options.permit2TransferFrom.recipient : ROUTER_AS_RECIPIENT) as Address,
            BigInt(options.permit2TransferFrom.amount),
        ]);
    }
}

// function mapApprovalProtocol(protocolAddress: string): number {
//     switch (protocolAddress.toLowerCase()) {
//         case '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': // Seaport v1.5
//             return OPENSEA_CONDUIT_SPENDER_ID;
//         case '0x00000000000001ad428e4906ae43d8f9852d0dd6': // Seaport v1.4
//             return OPENSEA_CONDUIT_SPENDER_ID;
//         case '0x2b2e8cda09bba9660dca5cb6233787738ad68329': // Sudoswap
//             return SUDOSWAP_SPENDER_ID;
//         default:
//             throw new Error('unsupported protocol address');
//     }
// }
