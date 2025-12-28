/**
 * Mixing Package Entry Point
 * Placeholder for transaction mixing and relayer network
 */

export const MIXING_VERSION = '0.1.0';

// Placeholder interfaces
export interface RelayerNode {
	id: string;
	address: string;
	stake: bigint;
}

export interface MixingPool {
	size: number;
	minDelay: number;
	maxDelay: number;
}
