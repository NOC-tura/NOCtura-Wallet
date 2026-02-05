/**
 * Key Derivation System for Noctura Wallet
 * 
 * Implements BIP39 mnemonic generation and BIP44 hierarchical deterministic
 * key derivation for both transparent and shielded wallet modes.
 * 
 * Derivation Paths:
 * - Transparent: m/44'/501'/0'/0' (standard Solana)
 * - Shielded Spend: m/44'/501'/1'/0'
 * - Shielded View: m/44'/501'/1'/1'
 * - Disclosure: m/44'/501'/1'/2'
 * 
 * Security: All keys are derived using industry-standard cryptographic
 * primitives with constant-time operations where possible.
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { Keypair } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { randomBytes } from '@noble/hashes/utils';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';

// Configure ed25519 to use sha512 from @noble/hashes
ed25519.etc.sha512Sync = (...msgs) => sha512(ed25519.etc.concatBytes(...msgs));

/**
 * Solana coin type for BIP44 derivation
 */
export const SOLANA_COIN_TYPE = 501;

/**
 * Derivation path purposes
 */
export enum DerivationPurpose {
  TRANSPARENT = 0,
  SHIELDED = 1,
}

/**
 * Shielded key types
 */
export enum ShieldedKeyType {
  SPEND = 0,
  VIEW = 1,
  DISCLOSURE = 2,
}

/**
 * Mnemonic strength options
 */
export enum MnemonicStrength {
  WORDS_12 = 128, // 128 bits = 12 words
  WORDS_24 = 256, // 256 bits = 24 words
}

/**
 * Derived key set for a wallet
 */
export interface DerivedKeySet {
  // Transparent mode keys
  transparent: {
    keypair: Keypair;
    publicKey: string;
    derivationPath: string;
  };
  // Shielded mode keys
  shielded: {
    spendKey: {
      privateKey: Uint8Array;
      publicKey: Uint8Array;
      derivationPath: string;
    };
    viewKey: {
      privateKey: Uint8Array;
      publicKey: Uint8Array;
      derivationPath: string;
    };
    disclosureKey: {
      privateKey: Uint8Array;
      publicKey: Uint8Array;
      derivationPath: string;
    };
  };
}

/**
 * Master seed derived from mnemonic
 */
export interface MasterSeed {
  seed: Uint8Array;
  mnemonic: string;
  passphrase?: string;
}

/**
 * Generate a new mnemonic phrase
 * @param strength - Number of bits (128 = 12 words, 256 = 24 words)
 * @returns Mnemonic phrase as string
 */
export function generateMnemonic(
  strength: MnemonicStrength = MnemonicStrength.WORDS_24
): string {
  const entropy = randomBytes(strength / 8);
  return bip39.entropyToMnemonic(entropy, wordlist);
}

/**
 * Validate a mnemonic phrase
 * @param mnemonic - The mnemonic phrase to validate
 * @returns True if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    return bip39.validateMnemonic(mnemonic, wordlist);
  } catch {
    return false;
  }
}

/**
 * Derive master seed from mnemonic
 * @param mnemonic - The mnemonic phrase
 * @param passphrase - Optional passphrase for additional security
 * @returns Master seed object
 */
export function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = ''
): MasterSeed {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  
  return {
    seed: new Uint8Array(seed),
    mnemonic,
    passphrase: passphrase || undefined,
  };
}

/**
 * Derive a Solana keypair from seed at a specific derivation path
 * Uses BIP44 derivation: m/44'/501'/account'/change'
 */
export function deriveKeypairFromSeed(
  seed: Uint8Array,
  account: number = 0,
  change: number = 0,
  purpose: DerivationPurpose = DerivationPurpose.TRANSPARENT
): { keypair: Keypair; derivationPath: string } {
  const derivationPath = `m/44'/${SOLANA_COIN_TYPE}'/${purpose}'/${account}'`;
  
  const hdKey = HDKey.fromMasterSeed(seed);
  const derived = hdKey.derive(derivationPath);
  
  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }
  
  // Solana uses Ed25519, which needs 32-byte private keys
  // The derived key is used as seed for Ed25519 keypair
  const keypair = Keypair.fromSeed(derived.privateKey);
  
  return {
    keypair,
    derivationPath,
  };
}

/**
 * Derive shielded key from seed
 * These keys are used for private transactions
 */
export function deriveShieldedKey(
  seed: Uint8Array,
  keyType: ShieldedKeyType,
  account: number = 0
): { privateKey: Uint8Array; publicKey: Uint8Array; derivationPath: string } {
  const derivationPath = `m/44'/${SOLANA_COIN_TYPE}'/${DerivationPurpose.SHIELDED}'/${keyType}'`;
  
  const hdKey = HDKey.fromMasterSeed(seed);
  const derived = hdKey.derive(derivationPath);
  
  if (!derived.privateKey) {
    throw new Error('Failed to derive shielded key');
  }
  
  // For shielded operations, we use the derived key directly
  // The public key is derived from the private key using Ed25519
  const privateKey = derived.privateKey;
  const publicKey = ed25519.getPublicKey(privateKey);
  
  return {
    privateKey: new Uint8Array(privateKey),
    publicKey: new Uint8Array(publicKey),
    derivationPath,
  };
}

/**
 * Derive complete key set from mnemonic
 * This generates all keys needed for the wallet
 */
export function deriveKeySet(
  mnemonic: string,
  passphrase: string = '',
  account: number = 0
): DerivedKeySet {
  const { seed } = mnemonicToSeed(mnemonic, passphrase);
  
  // Derive transparent mode keypair
  const transparent = deriveKeypairFromSeed(
    seed,
    account,
    0,
    DerivationPurpose.TRANSPARENT
  );
  
  // Derive shielded mode keys
  const spendKey = deriveShieldedKey(seed, ShieldedKeyType.SPEND, account);
  const viewKey = deriveShieldedKey(seed, ShieldedKeyType.VIEW, account);
  const disclosureKey = deriveShieldedKey(seed, ShieldedKeyType.DISCLOSURE, account);
  
  return {
    transparent: {
      keypair: transparent.keypair,
      publicKey: transparent.keypair.publicKey.toBase58(),
      derivationPath: transparent.derivationPath,
    },
    shielded: {
      spendKey,
      viewKey,
      disclosureKey,
    },
  };
}

/**
 * Derive view key for sharing read access
 * This allows others to view transactions without spending ability
 */
export function deriveViewKeyForSharing(
  viewKey: Uint8Array,
  scope: 'full' | 'incoming' | 'outgoing' | 'balance',
  expiresAt?: Date
): {
  key: string;
  scope: string;
  expiresAt?: Date;
} {
  // Create a scoped view key by hashing the view key with scope
  const scopeBytes = new TextEncoder().encode(scope);
  const combined = new Uint8Array([...viewKey, ...scopeBytes]);
  const scopedKey = sha256(combined);
  
  return {
    key: bs58.encode(scopedKey),
    scope,
    expiresAt,
  };
}

/**
 * Key stretching using PBKDF2 for PIN/password derived encryption keys
 * Uses high iteration count for resistance against brute force
 */
export function deriveEncryptionKeyFromPin(
  pin: string,
  salt: Uint8Array,
  iterations: number = 100000
): Uint8Array {
  const pinBytes = new TextEncoder().encode(pin);
  
  return pbkdf2(sha256, pinBytes, salt, {
    c: iterations,
    dkLen: 32, // 256-bit key for AES-256
  });
}

/**
 * Generate random salt for key derivation
 */
export function generateSalt(length: number = 32): Uint8Array {
  return randomBytes(length);
}

/**
 * Securely wipe sensitive data from memory
 * Note: JavaScript doesn't guarantee memory wiping, but this helps
 */
export function secureWipe(data: Uint8Array): void {
  // Overwrite with random data multiple times
  for (let i = 0; i < 3; i++) {
    const random = randomBytes(data.length);
    data.set(random);
  }
  // Final zero fill
  data.fill(0);
}

/**
 * Convert keypair to exportable format (for backup)
 * WARNING: This exposes the private key - use with extreme caution
 */
export function exportKeypair(keypair: Keypair): {
  publicKey: string;
  secretKey: number[];
} {
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
  };
}

/**
 * Import keypair from exported format
 */
export function importKeypair(data: {
  publicKey: string;
  secretKey: number[];
}): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(data.secretKey));
}

/**
 * Derive multiple accounts from the same mnemonic
 * Useful for HD wallet with multiple addresses
 */
export function deriveMultipleAccounts(
  mnemonic: string,
  passphrase: string = '',
  count: number = 5
): DerivedKeySet[] {
  const accounts: DerivedKeySet[] = [];
  
  for (let i = 0; i < count; i++) {
    accounts.push(deriveKeySet(mnemonic, passphrase, i));
  }
  
  return accounts;
}
