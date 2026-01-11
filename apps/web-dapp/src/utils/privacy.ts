import { poseidon } from 'poseidon-lite';

const POSEIDON_DOMAIN = BigInt('0x4e4f43545f50525659'); // "NOCT_PRVY" domain separator

function ensureCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Secure crypto APIs are unavailable');
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return BigInt(`0x${hex || '0'}`);
}

function truncateHash(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-3);
  return `0x${prefix}...${suffix} (ZK-Hash)`;
}

export function generateZKHashDisplay(
  recipientPubkey: Uint8Array,
  tokenMint: Uint8Array,
  amount: bigint,
  randomness: Uint8Array
): string {
  const recipientField = bytesToBigInt(recipientPubkey);
  const mintField = bytesToBigInt(tokenMint);
  const amountField = amount;
  const randomnessField = bytesToBigInt(randomness);

  const hash = poseidon([
    POSEIDON_DOMAIN,
    recipientField,
    mintField,
    amountField,
    randomnessField,
  ]);

  const hex = hash.toString(16).padStart(64, '0');
  return truncateHash(`0x${hex}`);
}

export function generateSecureRandomness(): Uint8Array {
  const cryptoApi = ensureCrypto();
  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return bytes;
}
