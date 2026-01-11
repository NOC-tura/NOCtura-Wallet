import { generateSecureRandomBytes } from './crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

function ensureCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Crypto APIs unavailable');
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...bytes));
  }
  throw new Error('Base64 encoding unavailable in this environment');
}

function fromBase64(encoded: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(encoded, 'base64'));
  }
  if (typeof atob !== 'undefined') {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Base64 decoding unavailable in this environment');
}

async function importAesKey(masterKey: Uint8Array): Promise<CryptoKey> {
  const cryptoApi = ensureCrypto();
  if (masterKey.length < 32) {
    throw new Error('Master key must be at least 32 bytes for AES-256-GCM');
  }
  return cryptoApi.subtle.importKey('raw', masterKey.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSensitiveData(data: unknown, masterKey: Uint8Array): Promise<EncryptedData> {
  const cryptoApi = ensureCrypto();
  const key = await importAesKey(masterKey);
  const iv = generateSecureRandomBytes(12);
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuffer = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded.buffer);
  return {
    ciphertext: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
  };
}

export async function decryptSensitiveData(encrypted: EncryptedData, masterKey: Uint8Array): Promise<unknown> {
  const cryptoApi = ensureCrypto();
  const key = await importAesKey(masterKey);
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const plainBuffer = await cryptoApi.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext.buffer);
  const decoded = new TextDecoder().decode(new Uint8Array(plainBuffer));
  return JSON.parse(decoded);
}

export async function storeTransactionAmount(txId: string, amount: bigint, masterKey: Uint8Array): Promise<void> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const encrypted = await encryptSensitiveData({ amount: amount.toString() }, masterKey);
  window.localStorage.setItem(`tx_amount_${txId}`, JSON.stringify(encrypted));
}

export async function getTransactionAmount(txId: string, masterKey: Uint8Array): Promise<bigint | null> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  const stored = window.localStorage.getItem(`tx_amount_${txId}`);
  if (!stored) return null;
  const encrypted = JSON.parse(stored) as EncryptedData;
  const decrypted = (await decryptSensitiveData(encrypted, masterKey)) as { amount: string };
  return BigInt(decrypted.amount);
}
