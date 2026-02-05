/**
 * Tests for Noctura Wallet Cryptographic Foundation
 * 
 * Tests key derivation, encryption, and secure storage functionality.
 */

import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveKeySet,
  deriveEncryptionKeyFromPin,
  generateSalt,
  secureWipe,
  MnemonicStrength,
} from '../src/crypto/keyDerivation';

import {
  encryptData,
  decryptData,
  encryptMnemonic,
  decryptMnemonic,
  validatePinStrength,
  SecureStorage,
} from '../src/crypto/secureStorage';

describe('Key Derivation', () => {
  describe('Mnemonic Generation', () => {
    test('generates valid 12-word mnemonic', () => {
      const mnemonic = generateMnemonic(MnemonicStrength.WORDS_12);
      const words = mnemonic.split(' ');
      
      expect(words.length).toBe(12);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    test('generates valid 24-word mnemonic', () => {
      const mnemonic = generateMnemonic(MnemonicStrength.WORDS_24);
      const words = mnemonic.split(' ');
      
      expect(words.length).toBe(24);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    test('generates unique mnemonics each time', () => {
      const mnemonic1 = generateMnemonic();
      const mnemonic2 = generateMnemonic();
      
      expect(mnemonic1).not.toBe(mnemonic2);
    });
  });

  describe('Mnemonic Validation', () => {
    test('validates correct mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    test('rejects invalid mnemonic', () => {
      const invalid = 'invalid words that are not a mnemonic';
      expect(validateMnemonic(invalid)).toBe(false);
    });

    test('rejects empty mnemonic', () => {
      expect(validateMnemonic('')).toBe(false);
    });
  });

  describe('Seed Derivation', () => {
    test('derives seed from mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const { seed } = mnemonicToSeed(mnemonic);
      
      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(64); // 512 bits
    });

    test('same mnemonic produces same seed', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const { seed: seed1 } = mnemonicToSeed(mnemonic);
      const { seed: seed2 } = mnemonicToSeed(mnemonic);
      
      expect(Buffer.from(seed1).toString('hex')).toBe(Buffer.from(seed2).toString('hex'));
    });

    test('different passphrase produces different seed', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const { seed: seed1 } = mnemonicToSeed(mnemonic, '');
      const { seed: seed2 } = mnemonicToSeed(mnemonic, 'password');
      
      expect(Buffer.from(seed1).toString('hex')).not.toBe(Buffer.from(seed2).toString('hex'));
    });

    test('throws on invalid mnemonic', () => {
      expect(() => mnemonicToSeed('invalid mnemonic')).toThrow('Invalid mnemonic phrase');
    });
  });

  describe('Key Set Derivation', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('derives complete key set', () => {
      const keySet = deriveKeySet(testMnemonic);
      
      // Check transparent keys
      expect(keySet.transparent.keypair).toBeDefined();
      expect(keySet.transparent.publicKey).toBeDefined();
      expect(keySet.transparent.derivationPath).toBe("m/44'/501'/0'/0'");
      
      // Check shielded keys
      expect(keySet.shielded.spendKey.privateKey).toBeInstanceOf(Uint8Array);
      expect(keySet.shielded.spendKey.publicKey).toBeInstanceOf(Uint8Array);
      expect(keySet.shielded.viewKey.privateKey).toBeInstanceOf(Uint8Array);
      expect(keySet.shielded.disclosureKey.privateKey).toBeInstanceOf(Uint8Array);
    });

    test('derives valid Solana public key', () => {
      const keySet = deriveKeySet(testMnemonic);
      
      // Solana public keys are 32 bytes, base58 encoded
      expect(keySet.transparent.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });

    test('different accounts produce different keys', () => {
      const keySet0 = deriveKeySet(testMnemonic, '', 0);
      const keySet1 = deriveKeySet(testMnemonic, '', 1);
      
      expect(keySet0.transparent.publicKey).not.toBe(keySet1.transparent.publicKey);
    });

    test('same mnemonic and account produces same keys', () => {
      const keySet1 = deriveKeySet(testMnemonic, '', 0);
      const keySet2 = deriveKeySet(testMnemonic, '', 0);
      
      expect(keySet1.transparent.publicKey).toBe(keySet2.transparent.publicKey);
    });
  });

  describe('PIN Key Derivation', () => {
    test('derives encryption key from PIN', () => {
      const salt = generateSalt();
      const key = deriveEncryptionKeyFromPin('123456', salt);
      
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32); // 256 bits
    });

    test('same PIN and salt produces same key', () => {
      const salt = generateSalt();
      const key1 = deriveEncryptionKeyFromPin('123456', salt);
      const key2 = deriveEncryptionKeyFromPin('123456', salt);
      
      expect(Buffer.from(key1).toString('hex')).toBe(Buffer.from(key2).toString('hex'));
    });

    test('different salt produces different key', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const key1 = deriveEncryptionKeyFromPin('123456', salt1);
      const key2 = deriveEncryptionKeyFromPin('123456', salt2);
      
      expect(Buffer.from(key1).toString('hex')).not.toBe(Buffer.from(key2).toString('hex'));
    });
  });

  describe('Secure Wipe', () => {
    test('wipes data from array', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      secureWipe(data);
      
      // All bytes should be 0 after wipe
      expect(data.every(b => b === 0)).toBe(true);
    });
  });
});

describe('Secure Storage', () => {
  describe('Data Encryption', () => {
    test('encrypts and decrypts string data', async () => {
      const data = 'secret message';
      const password = 'testpassword123';
      
      const encrypted = await encryptData(data, password);
      const decrypted = await decryptData(encrypted, password);
      
      expect(decrypted).toBe(data);
    });

    test('encrypts and decrypts object data', async () => {
      const data = { key: 'value', number: 42 };
      const password = 'testpassword123';
      
      const encrypted = await encryptData(data, password);
      const decrypted = await decryptData(encrypted, password);
      
      expect(JSON.parse(decrypted)).toEqual(data);
    });

    test('fails with wrong password', async () => {
      const data = 'secret message';
      const encrypted = await encryptData(data, 'correctpassword');
      
      await expect(decryptData(encrypted, 'wrongpassword'))
        .rejects.toThrow('Decryption failed');
    });

    test('produces different ciphertext each time', async () => {
      const data = 'same data';
      const password = 'password';
      
      const encrypted1 = await encryptData(data, password);
      const encrypted2 = await encryptData(data, password);
      
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('Mnemonic Encryption', () => {
    test('encrypts and decrypts mnemonic', async () => {
      const mnemonic = generateMnemonic();
      const pin = '123456';
      
      const encrypted = await encryptMnemonic(mnemonic, pin);
      const decrypted = await decryptMnemonic(encrypted, pin);
      
      expect(decrypted).toBe(mnemonic);
    });
  });

  describe('PIN Validation', () => {
    test('accepts valid PIN', () => {
      const result = validatePinStrength('securepin123');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects short PIN', () => {
      const result = validatePinStrength('12345');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PIN must be at least 6 characters');
    });

    test('rejects common PIN', () => {
      const result = validatePinStrength('123456');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PIN is too common and easily guessable');
    });
  });

  describe('SecureStorage Class', () => {
    test('stores and retrieves data when unlocked', async () => {
      const storage = new SecureStorage();
      const password = 'testpassword';
      
      // Create encrypted key
      const keyData = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
      const encryptedKey = await encryptData(keyData, password);
      
      // Unlock and use
      await storage.unlock(password, encryptedKey);
      expect(storage.isUnlocked()).toBe(true);
      
      await storage.set('test', { value: 'data' });
      const retrieved = await storage.get<{ value: string }>('test');
      
      expect(retrieved).toEqual({ value: 'data' });
      
      // Lock
      storage.lock();
      expect(storage.isUnlocked()).toBe(false);
    });

    test('throws when accessing locked storage', async () => {
      const storage = new SecureStorage();
      
      await expect(storage.set('key', {})).rejects.toThrow('Storage is locked');
      await expect(storage.get('key')).rejects.toThrow('Storage is locked');
    });
  });
});

describe('Integration: Full Wallet Creation Flow', () => {
  test('creates wallet from mnemonic with encrypted storage', async () => {
    // 1. Generate mnemonic
    const mnemonic = generateMnemonic(MnemonicStrength.WORDS_24);
    expect(validateMnemonic(mnemonic)).toBe(true);
    
    // 2. Derive all keys
    const keySet = deriveKeySet(mnemonic);
    expect(keySet.transparent.publicKey).toBeDefined();
    expect(keySet.shielded.spendKey.privateKey).toBeDefined();
    
    // 3. Encrypt mnemonic with PIN
    const pin = 'secure_pin_789';
    const encryptedMnemonic = await encryptMnemonic(mnemonic, pin);
    
    // 4. Verify mnemonic can be recovered
    const recoveredMnemonic = await decryptMnemonic(encryptedMnemonic, pin);
    expect(recoveredMnemonic).toBe(mnemonic);
    
    // 5. Verify keys can be re-derived
    const recoveredKeySet = deriveKeySet(recoveredMnemonic);
    expect(recoveredKeySet.transparent.publicKey).toBe(keySet.transparent.publicKey);
    
    console.log('✅ Full wallet creation flow completed successfully!');
    console.log(`   Public Key: ${keySet.transparent.publicKey}`);
  });
});
