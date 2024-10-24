import { Percent } from '@real-wagmi/sdk';

export function encodeFeeBips(fee: Percent): bigint {
    return fee.multiply(10_000).quotient;
}
