import { AbiParametersToPrimitiveTypes } from 'abitype';
import { Hex, encodeAbiParameters, parseAbiParameters } from 'viem';

export type ABIType = typeof ABI_PARAMETER;
export type ABIParametersType<TCommandType extends CommandUsed> = AbiParametersToPrimitiveTypes<ABIType[TCommandType]>;

/**
 * CommandTypes
 * @description Flags that modify a command's execution
 * @enum {number}
 */
export enum CommandType {
    V3_SWAP_EXACT_IN = 0x00,
    V3_SWAP_EXACT_OUT = 0x01,
    PERMIT2_TRANSFER_FROM = 0x02,
    PERMIT2_PERMIT_BATCH = 0x03,
    SWEEP = 0x04,
    TRANSFER = 0x05,
    PAY_PORTION = 0x06,

    V2_SWAP_EXACT_IN = 0x08,
    V2_SWAP_EXACT_OUT = 0x09,
    PERMIT2_PERMIT = 0x0a,
    WRAP_ETH = 0x0b,
    UNWRAP_WETH = 0x0c,
    PERMIT2_TRANSFER_FROM_BATCH = 0x0d,
    BALANCE_CHECK_ERC20 = 0x0e,

    // NFT-related command types
    SEAPORT_V1_5 = 0x10,
    LOOKS_RARE_V2 = 0x11,
    NFTX = 0x12,
    CRYPTOPUNKS = 0x13,
    // 0x14
    OWNER_CHECK_721 = 0x15,
    OWNER_CHECK_1155 = 0x16,
    SWEEP_ERC721 = 0x17,

    X2Y2_721 = 0x18,
    SUDOSWAP = 0x19,
    NFT20 = 0x1a,
    X2Y2_1155 = 0x1b,
    FOUNDATION = 0x1c,
    SWEEP_ERC1155 = 0x1d,
    ELEMENT_MARKET = 0x1e,

    SEAPORT_V1_4 = 0x20,
    EXECUTE_SUB_PLAN = 0x21,
    APPROVE_ERC20 = 0x22,
    WRAP_STETH = 0x23,
    UNWRAP_STETH = 0x24,
}

const ALLOW_REVERT_FLAG = 0x80;

const REVERTIBLE_COMMANDS = new Set<CommandType>([
    CommandType.SEAPORT_V1_5,
    CommandType.SEAPORT_V1_4,
    CommandType.NFTX,
    CommandType.LOOKS_RARE_V2,
    CommandType.X2Y2_721,
    CommandType.X2Y2_1155,
    CommandType.FOUNDATION,
    CommandType.SUDOSWAP,
    CommandType.NFT20,
    CommandType.EXECUTE_SUB_PLAN,
    CommandType.CRYPTOPUNKS,
    CommandType.ELEMENT_MARKET,
]);

const PERMIT_STRUCT = '((address token,uint160 amount,uint48 expiration,uint48 nonce) details,address spender,uint256 sigDeadline)';

const PERMIT_BATCH_STRUCT = '((address token,uint160 amount,uint48 expiration,uint48 nonce)[] details,address spender,uint256 sigDeadline)';

const PERMIT2_TRANSFER_FROM_STRUCT = '(address from,address to,uint160 amount,address token)';
const PERMIT2_TRANSFER_FROM_BATCH_STRUCT = PERMIT2_TRANSFER_FROM_STRUCT + '[]';

export const ABI_PARAMETER = {
    // Batch Reverts
    [CommandType.EXECUTE_SUB_PLAN]: parseAbiParameters(['bytes', 'bytes[]']),

    // Permit2 Actions
    [CommandType.PERMIT2_PERMIT]: parseAbiParameters([PERMIT_STRUCT, 'bytes']),
    [CommandType.PERMIT2_PERMIT_BATCH]: parseAbiParameters([PERMIT_BATCH_STRUCT, 'bytes']),
    [CommandType.PERMIT2_TRANSFER_FROM]: parseAbiParameters(['address', 'address', 'uint160']),
    [CommandType.PERMIT2_TRANSFER_FROM_BATCH]: parseAbiParameters([PERMIT2_TRANSFER_FROM_BATCH_STRUCT]),

    // Uniswap Actions
    [CommandType.V3_SWAP_EXACT_IN]: parseAbiParameters(['address', 'uint256', 'uint256', 'bytes', 'bool']),
    [CommandType.V3_SWAP_EXACT_OUT]: parseAbiParameters(['address', 'uint256', 'uint256', 'bytes', 'bool']),
    [CommandType.V2_SWAP_EXACT_IN]: parseAbiParameters(['address', 'uint256', 'uint256', 'address[]', 'bool']),
    [CommandType.V2_SWAP_EXACT_OUT]: parseAbiParameters(['address', 'uint256', 'uint256', 'address[]', 'bool']),

    // Token Actions and Checks
    [CommandType.WRAP_ETH]: parseAbiParameters(['address', 'uint256']),
    [CommandType.UNWRAP_WETH]: parseAbiParameters(['address', 'uint256']),
    [CommandType.SWEEP]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.SWEEP_ERC721]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.SWEEP_ERC1155]: parseAbiParameters(['address', 'address', 'uint256', 'uint256']),
    [CommandType.TRANSFER]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.PAY_PORTION]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.BALANCE_CHECK_ERC20]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.OWNER_CHECK_721]: parseAbiParameters(['address', 'address', 'uint256']),
    [CommandType.OWNER_CHECK_1155]: parseAbiParameters(['address', 'address', 'uint256', 'uint256']),
    [CommandType.APPROVE_ERC20]: parseAbiParameters(['address', 'uint256']),
    [CommandType.WRAP_STETH]: parseAbiParameters(['address', 'uint256']),
    [CommandType.UNWRAP_STETH]: parseAbiParameters(['address', 'uint256']),

    // NFT Markets
    [CommandType.SEAPORT_V1_5]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.SEAPORT_V1_4]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.NFTX]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.LOOKS_RARE_V2]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.X2Y2_721]: parseAbiParameters(['uint256', 'bytes', 'address', 'address', 'uint256']),
    [CommandType.X2Y2_1155]: parseAbiParameters(['uint256', 'bytes', 'address', 'address', 'uint256', 'uint256']),
    [CommandType.FOUNDATION]: parseAbiParameters(['uint256', 'bytes', 'address', 'address', 'uint256']),
    [CommandType.SUDOSWAP]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.NFT20]: parseAbiParameters(['uint256', 'bytes']),
    [CommandType.CRYPTOPUNKS]: parseAbiParameters(['uint256', 'address', 'uint256']),
    [CommandType.ELEMENT_MARKET]: parseAbiParameters(['uint256', 'bytes']),
};

export type CommandUsed = keyof typeof ABI_PARAMETER;

export class RoutePlanner {
    commands: Hex;
    inputs: Hex[];

    constructor() {
        this.commands = '0x';
        this.inputs = [];
    }

    addSubPlan(subplan: RoutePlanner): void {
        this.addCommand(CommandType.EXECUTE_SUB_PLAN, [subplan.commands, subplan.inputs], true);
    }

    addCommand<TCommandType extends CommandUsed>(type: TCommandType, parameters: ABIParametersType<TCommandType>, allowRevert = false): void {
        const command = createCommand(type, parameters);
        this.inputs.push(command.encodedInput);
        if (allowRevert) {
            if (!REVERTIBLE_COMMANDS.has(command.type)) {
                throw new Error(`command type: ${command.type} cannot be allowed to revert`);
            }
            command.type |= ALLOW_REVERT_FLAG;
        }

        this.commands = this.commands.concat(command.type.toString(16).padStart(2, '0')) as Hex;
    }
}

export type RouterCommand = {
    type: CommandUsed;
    encodedInput: Hex;
};

export function createCommand<TCommandType extends CommandUsed>(type: TCommandType, parameters: ABIParametersType<TCommandType>): RouterCommand {
    const encodedInput = encodeAbiParameters(ABI_PARAMETER[type], parameters as any);
    return { type, encodedInput };
}
