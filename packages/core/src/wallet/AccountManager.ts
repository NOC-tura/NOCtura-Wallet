/**
 * Account Manager - Handle multiple accounts from single wallet
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { WalletAccount, AccountType, NocturaError } from '../types';
import { DERIVATION_PATH } from '../utils/Constants';
import { validateAccountIndex } from '../utils/Validation';

/**
 * Account Manager for creating and managing multiple accounts
 */
export class AccountManager {
  private accounts: Map<string, WalletAccount> = new Map();
  private accountIndex: number = 0;

  constructor() {}

  /**
   * Create a new transparent account
   * Note: Actual key derivation will be implemented later with secure key management
   */
  public async createTransparentAccount(name: string): Promise<WalletAccount> {
    validateAccountIndex(this.accountIndex);

    // Placeholder: In production, derive from master seed
    // For now, generate random keypair for structure
    const keypair = Keypair.generate();
    
    const account: WalletAccount = {
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      type: AccountType.TRANSPARENT,
      name: name || `Account ${this.accountIndex + 1}`,
      balance: BigInt(0),
      lamports: 0,
      createdAt: new Date(),
      tokens: [],
    };

    this.accounts.set(account.address, account);
    this.accountIndex++;

    return account;
  }

  /**
   * Create a new shielded account
   * Note: Shielded key derivation follows different path
   */
  public async createShieldedAccount(name: string): Promise<WalletAccount> {
    validateAccountIndex(this.accountIndex);

    // Placeholder: Derive shielded keys with different path
    const keypair = Keypair.generate();
    
    const account: WalletAccount = {
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      type: AccountType.SHIELDED,
      name: name || `Shielded ${this.accountIndex + 1}`,
      balance: BigInt(0),
      lamports: 0,
      createdAt: new Date(),
      tokens: [],
    };

    this.accounts.set(account.address, account);
    this.accountIndex++;

    return account;
  }

  /**
   * Create a multi-sig account
   */
  public async createMultiSigAccount(
    name: string,
    owners: string[],
    threshold: number
  ): Promise<WalletAccount> {
    if (owners.length === 0) {
      throw new NocturaError('INVALID_MULTISIG', 'At least one owner required');
    }

    if (threshold < 1 || threshold > owners.length) {
      throw new NocturaError(
        'INVALID_MULTISIG',
        'Threshold must be between 1 and number of owners'
      );
    }

    // Placeholder: Multi-sig address derivation
    const keypair = Keypair.generate();
    
    const account: WalletAccount = {
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      type: AccountType.MULTISIG,
      name: name || `MultiSig ${this.accountIndex + 1}`,
      balance: BigInt(0),
      lamports: 0,
      createdAt: new Date(),
      tokens: [],
    };

    this.accounts.set(account.address, account);
    this.accountIndex++;

    return account;
  }

  /**
   * Get all accounts
   */
  public getAllAccounts(): WalletAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account by address
   */
  public getAccount(address: string): WalletAccount | undefined {
    return this.accounts.get(address);
  }

  /**
   * Get accounts by type
   */
  public getAccountsByType(type: AccountType): WalletAccount[] {
    return Array.from(this.accounts.values()).filter((acc) => acc.type === type);
  }

  /**
   * Update account name
   */
  public updateAccountName(address: string, newName: string): void {
    const account = this.accounts.get(address);
    if (!account) {
      throw new NocturaError('ACCOUNT_NOT_FOUND', `Account ${address} not found`);
    }
    account.name = newName;
  }

  /**
   * Delete account (requires confirmation)
   */
  public async deleteAccount(address: string): Promise<void> {
    const account = this.accounts.get(address);
    if (!account) {
      throw new NocturaError('ACCOUNT_NOT_FOUND', `Account ${address} not found`);
    }

    // Check if account has balance
    if (account.balance > BigInt(0) || account.lamports > 0) {
      throw new NocturaError(
        'ACCOUNT_HAS_BALANCE',
        'Cannot delete account with balance. Transfer funds first.'
      );
    }

    this.accounts.delete(address);
  }

  /**
   * Get next account index
   */
  public getNextAccountIndex(): number {
    return this.accountIndex;
  }

  /**
   * Get derivation path for account
   */
  public getDerivationPath(accountIndex: number, isShielded: boolean = false): string {
    if (isShielded) {
      return DERIVATION_PATH.SHIELDED(accountIndex);
    }
    return DERIVATION_PATH.SOLANA_ACCOUNT(accountIndex);
  }

  /**
   * Import existing account by public key
   * (Watch-only mode)
   */
  public async importWatchOnlyAccount(
    publicKey: string,
    name: string
  ): Promise<WalletAccount> {
    // Validate public key
    try {
      new PublicKey(publicKey);
    } catch {
      throw new NocturaError('INVALID_PUBLIC_KEY', 'Invalid public key format');
    }

    const account: WalletAccount = {
      address: publicKey,
      publicKey: publicKey,
      type: AccountType.TRANSPARENT,
      name: name || 'Imported Account',
      balance: BigInt(0),
      lamports: 0,
      createdAt: new Date(),
      tokens: [],
    };

    this.accounts.set(account.address, account);
    return account;
  }

  /**
   * Get total accounts count
   */
  public getAccountsCount(): number {
    return this.accounts.size;
  }

  /**
   * Clear all accounts (for wallet reset)
   */
  public clearAllAccounts(): void {
    this.accounts.clear();
    this.accountIndex = 0;
  }
}
