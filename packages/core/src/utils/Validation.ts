/**
 * Validation utilities for Noctura Wallet
 */

import { PublicKey } from '@solana/web3.js';
import { NocturaError, InvalidAddressError } from '../types';

/**
 * Validate a Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    const publicKey = new PublicKey(address);
    return PublicKey.isOnCurve(publicKey.toBytes());
  } catch {
    return false;
  }
}

/**
 * Validate and throw if address is invalid
 */
export function validateAddress(address: string): void {
  if (!isValidSolanaAddress(address)) {
    throw new InvalidAddressError(`Invalid Solana address: ${address}`);
  }
}

/**
 * Validate amount (must be positive)
 */
export function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new NocturaError('INVALID_AMOUNT', 'Amount must be greater than 0');
  }
  if (!Number.isFinite(amount)) {
    throw new NocturaError('INVALID_AMOUNT', 'Amount must be a finite number');
  }
}

/**
 * Validate token decimals
 */
export function validateDecimals(decimals: number): void {
  if (decimals < 0 || decimals > 18) {
    throw new NocturaError('INVALID_DECIMALS', 'Decimals must be between 0 and 18');
  }
  if (!Number.isInteger(decimals)) {
    throw new NocturaError('INVALID_DECIMALS', 'Decimals must be an integer');
  }
}

/**
 * Validate slippage (0.1% to 5%)
 */
export function validateSlippage(slippage: number): void {
  if (slippage < 0.1 || slippage > 5) {
    throw new NocturaError(
      'INVALID_SLIPPAGE',
      'Slippage must be between 0.1% and 5%'
    );
  }
}

/**
 * Validate account index for derivation
 */
export function validateAccountIndex(index: number): void {
  if (index < 0) {
    throw new NocturaError('INVALID_ACCOUNT_INDEX', 'Account index must be non-negative');
  }
  if (!Number.isInteger(index)) {
    throw new NocturaError('INVALID_ACCOUNT_INDEX', 'Account index must be an integer');
  }
}

/**
 * Sanitize user input (prevent XSS)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 255); // Max length
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

/**
 * Parse token amount to smallest unit
 */
export function parseTokenAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}
