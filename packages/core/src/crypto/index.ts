/**
 * Cryptographic Utilities for Noctura Wallet
 * 
 * This module exports all cryptographic primitives needed for:
 * - Key generation and derivation (BIP39/BIP44)
 * - Secure encrypted storage (AES-256-GCM)
 * - Key management utilities
 */

// Key derivation
export {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveKeypairFromSeed,
  deriveShieldedKey,
  deriveKeySet,
  deriveViewKeyForSharing,
  deriveEncryptionKeyFromPin,
  generateSalt,
  secureWipe,
  exportKeypair,
  importKeypair,
  deriveMultipleAccounts,
  MnemonicStrength,
  DerivationPurpose,
  ShieldedKeyType,
  SOLANA_COIN_TYPE,
  type DerivedKeySet,
  type MasterSeed,
} from './keyDerivation';

// Secure storage
export {
  encryptData,
  decryptData,
  encryptMnemonic,
  decryptMnemonic,
  encryptWalletState,
  decryptWalletState,
  generateEncryptionKey,
  validatePinStrength,
  SecureStorage,
  type EncryptedData,
  type StorageConfig,
} from './secureStorage';
