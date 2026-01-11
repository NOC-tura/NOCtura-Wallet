function ensureCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Crypto APIs unavailable');
}

export function generateSecureRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Length must be positive');
  }
  const cryptoApi = ensureCrypto();
  const bytes = new Uint8Array(length);
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

export function generateCommitmentRandomness(): Uint8Array {
  return generateSecureRandomBytes(32);
}

export function verifyEntropyQuality(randomBytes: Uint8Array): boolean {
  if (randomBytes.length === 0) return false;
  const allZeros = randomBytes.every((b) => b === 0);
  if (allZeros) return false;

  // Simple heuristic: ensure at least two distinct values exist
  const uniqueValues = new Set(randomBytes);
  return uniqueValues.size > 1;
}
