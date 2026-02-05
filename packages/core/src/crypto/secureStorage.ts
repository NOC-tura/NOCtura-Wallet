/**
 * Secure Encrypted Storage for Noctura Wallet
 * 
 * Implements AES-256-GCM authenticated encryption for storing sensitive data
 * including mnemonics, private keys, and wallet state.
 * 
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV for each encryption operation
 * - Key derivation from PIN using PBKDF2 (100,000 iterations)
 * - Constant-time comparison for authentication
 * - Secure memory wiping
 */

import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';

/**
 * Encrypted data envelope
 */
export interface EncryptedData {
  version: number;
  algorithm: 'AES-256-GCM';
  iv: string; // Base64 encoded
  salt: string; // Base64 encoded
  iterations: number;
  ciphertext: string; // Base64 encoded
  tag: string; // Base64 encoded authentication tag
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  iterations?: number; // PBKDF2 iterations (default: 100000)
  saltLength?: number; // Salt length in bytes (default: 32)
  ivLength?: number; // IV length in bytes (default: 12 for GCM)
}

const DEFAULT_CONFIG: Required<StorageConfig> = {
  iterations: 100000,
  saltLength: 32,
  ivLength: 12,
};

/**
 * Current encryption version
 */
const ENCRYPTION_VERSION = 1;

/**
 * Convert Uint8Array to Base64
 */
function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  // Browser fallback
  return btoa(String.fromCharCode(...data));
}

/**
 * Convert Base64 to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  // Browser fallback
  return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
}

/**
 * Derive encryption key from PIN/password
 */
function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password);
  return pbkdf2(sha256, passwordBytes, salt, {
    c: iterations,
    dkLen: 32, // 256 bits for AES-256
  });
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Convert Uint8Array to ArrayBuffer (required for Web Crypto API)
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/**
 * AES-256-GCM encryption using Web Crypto API
 */
async function aesGcmEncrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array
): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
  // Use Web Crypto API for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128, // 16 bytes
    },
    cryptoKey,
    toArrayBuffer(plaintext)
  );
  
  // GCM appends the tag to the ciphertext
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertext = encryptedArray.slice(0, -16);
  const tag = encryptedArray.slice(-16);
  
  return { ciphertext, tag };
}

/**
 * AES-256-GCM decryption using Web Crypto API
 */
async function aesGcmDecrypt(
  ciphertext: Uint8Array,
  tag: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // GCM expects ciphertext + tag concatenated
  const combined = new Uint8Array([...ciphertext, ...tag]);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    cryptoKey,
    toArrayBuffer(combined)
  );
  
  return new Uint8Array(decrypted);
}

/**
 * Encrypt sensitive data with a PIN/password
 * 
 * @param data - The data to encrypt (string or object)
 * @param password - The PIN or password for encryption
 * @param config - Optional configuration overrides
 * @returns Encrypted data envelope
 */
export async function encryptData(
  data: string | object,
  password: string,
  config: StorageConfig = {}
): Promise<EncryptedData> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Generate random salt and IV
  const salt = randomBytes(cfg.saltLength);
  const iv = randomBytes(cfg.ivLength);
  
  // Derive encryption key from password
  const key = deriveKey(password, salt, cfg.iterations);
  
  // Convert data to bytes
  const plaintext = new TextEncoder().encode(
    typeof data === 'string' ? data : JSON.stringify(data)
  );
  
  // Encrypt
  const { ciphertext, tag } = await aesGcmEncrypt(plaintext, key, iv);
  
  // Securely wipe key from memory
  key.fill(0);
  
  return {
    version: ENCRYPTION_VERSION,
    algorithm: 'AES-256-GCM',
    iv: toBase64(iv),
    salt: toBase64(salt),
    iterations: cfg.iterations,
    ciphertext: toBase64(ciphertext),
    tag: toBase64(tag),
  };
}

/**
 * Decrypt encrypted data with a PIN/password
 * 
 * @param encrypted - The encrypted data envelope
 * @param password - The PIN or password for decryption
 * @returns Decrypted data as string
 * @throws Error if decryption fails (wrong password or tampered data)
 */
export async function decryptData(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  // Validate version
  if (encrypted.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }
  
  // Decode from Base64
  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const tag = fromBase64(encrypted.tag);
  
  // Derive encryption key
  const key = deriveKey(password, salt, encrypted.iterations);
  
  try {
    // Decrypt
    const plaintext = await aesGcmDecrypt(ciphertext, tag, key, iv);
    
    // Securely wipe key
    key.fill(0);
    
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    // Securely wipe key even on error
    key.fill(0);
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

/**
 * Encrypt and store a mnemonic phrase
 */
export async function encryptMnemonic(
  mnemonic: string,
  pin: string
): Promise<EncryptedData> {
  return encryptData(mnemonic, pin, {
    iterations: 150000, // Higher iterations for mnemonic
  });
}

/**
 * Decrypt a stored mnemonic phrase
 */
export async function decryptMnemonic(
  encrypted: EncryptedData,
  pin: string
): Promise<string> {
  return decryptData(encrypted, pin);
}

/**
 * Encrypt wallet state (balances, notes, etc.)
 */
export async function encryptWalletState(
  state: object,
  encryptionKey: Uint8Array
): Promise<EncryptedData> {
  // Use the key directly instead of deriving from password
  const iv = randomBytes(DEFAULT_CONFIG.ivLength);
  const plaintext = new TextEncoder().encode(JSON.stringify(state));
  
  const { ciphertext, tag } = await aesGcmEncrypt(plaintext, encryptionKey, iv);
  
  return {
    version: ENCRYPTION_VERSION,
    algorithm: 'AES-256-GCM',
    iv: toBase64(iv),
    salt: '', // No salt when using direct key
    iterations: 0,
    ciphertext: toBase64(ciphertext),
    tag: toBase64(tag),
  };
}

/**
 * Decrypt wallet state
 */
export async function decryptWalletState(
  encrypted: EncryptedData,
  encryptionKey: Uint8Array
): Promise<object> {
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const tag = fromBase64(encrypted.tag);
  
  const plaintext = await aesGcmDecrypt(ciphertext, tag, encryptionKey, iv);
  
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/**
 * Generate a secure random encryption key
 */
export function generateEncryptionKey(): Uint8Array {
  return randomBytes(32); // 256 bits
}

/**
 * Check if a PIN meets minimum security requirements
 */
export function validatePinStrength(pin: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (pin.length < 6) {
    errors.push('PIN must be at least 6 characters');
  }
  
  if (pin.length > 64) {
    errors.push('PIN must be at most 64 characters');
  }
  
  // Check for common weak PINs
  const weakPins = ['123456', '000000', '111111', '123123', 'password'];
  if (weakPins.includes(pin.toLowerCase())) {
    errors.push('PIN is too common and easily guessable');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Secure class for managing encrypted storage
 */
export class SecureStorage {
  private encryptionKey: Uint8Array | null = null;
  private storage: Map<string, EncryptedData> = new Map();
  
  /**
   * Unlock storage with a PIN
   */
  async unlock(pin: string, encryptedKey: EncryptedData): Promise<void> {
    const keyData = await decryptData(encryptedKey, pin);
    this.encryptionKey = fromBase64(keyData);
  }
  
  /**
   * Lock storage (clear encryption key)
   */
  lock(): void {
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
      this.encryptionKey = null;
    }
  }
  
  /**
   * Check if storage is unlocked
   */
  isUnlocked(): boolean {
    return this.encryptionKey !== null;
  }
  
  /**
   * Store encrypted data
   */
  async set(key: string, value: object): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Storage is locked');
    }
    
    const encrypted = await encryptWalletState(value, this.encryptionKey);
    this.storage.set(key, encrypted);
  }
  
  /**
   * Retrieve decrypted data
   */
  async get<T extends object>(key: string): Promise<T | null> {
    if (!this.encryptionKey) {
      throw new Error('Storage is locked');
    }
    
    const encrypted = this.storage.get(key);
    if (!encrypted) return null;
    
    return await decryptWalletState(encrypted, this.encryptionKey) as T;
  }
  
  /**
   * Delete stored data
   */
  delete(key: string): boolean {
    return this.storage.delete(key);
  }
  
  /**
   * Export all encrypted data for backup
   */
  exportAll(): Record<string, EncryptedData> {
    const result: Record<string, EncryptedData> = {};
    this.storage.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  /**
   * Import encrypted data from backup
   */
  importAll(data: Record<string, EncryptedData>): void {
    Object.entries(data).forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }
}
