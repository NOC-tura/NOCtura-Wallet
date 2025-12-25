/**
 * Token Registry - Manage token metadata and verification
 */

import { PublicKey } from '@solana/web3.js';
import { TokenMetadata, TokenListSource } from './types';
import { NocturaError } from '../types';
import { CACHE_TTL } from '../utils/Constants';

/**
 * Token Registry for managing token metadata
 */
export class TokenRegistry {
  private tokens: Map<string, TokenMetadata> = new Map();
  private customTokens: Map<string, TokenMetadata> = new Map();
  private tokenListSources: TokenListSource[] = [];
  private lastUpdate: Date | null = null;
  private cacheExpiry: number = CACHE_TTL.TOKEN_METADATA;

  constructor() {
    this.initializeTokenSources();
  }

  /**
   * Initialize token list sources
   */
  private initializeTokenSources(): void {
    this.tokenListSources = [
      {
        name: 'Solana Token List',
        url: 'https://token.jup.ag/strict',
        priority: 1,
      },
      {
        name: 'Jupiter Token List',
        url: 'https://token.jup.ag/all',
        priority: 2,
      },
    ];
  }

  /**
   * Load token list from sources
   */
  public async loadTokenList(): Promise<void> {
    try {
      // Sort sources by priority
      const sortedSources = [...this.tokenListSources].sort(
        (a, b) => a.priority - b.priority
      );

      for (const source of sortedSources) {
        try {
          await this.fetchTokenList(source.url);
          this.lastUpdate = new Date();
          console.log(`Loaded token list from ${source.name}`);
          return; // Success, exit
        } catch (error) {
          console.warn(`Failed to load from ${source.name}:`, error);
          continue; // Try next source
        }
      }

      throw new NocturaError('TOKEN_LIST_LOAD_FAILED', 'Failed to load token list from all sources');
    } catch (error) {
      console.error('Token list loading error:', error);
      throw error;
    }
  }

  /**
   * Fetch token list from URL
   */
  private async fetchTokenList(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const tokens = Array.isArray(data) ? data : data.tokens || [];

    for (const token of tokens) {
      const metadata: TokenMetadata = {
        mint: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
        verified: token.verified !== false, // Default to true if not specified
        tags: token.tags || [],
        extensions: token.extensions || {},
      };

      this.tokens.set(token.address, metadata);
    }
  }

  /**
   * Get token metadata by mint address
   */
  public async getToken(mint: string): Promise<TokenMetadata | null> {
    // Check cache expiry
    if (this.shouldRefreshCache()) {
      await this.loadTokenList();
    }

    // Check custom tokens first
    const customToken = this.customTokens.get(mint);
    if (customToken) {
      return customToken;
    }

    // Check official token list
    return this.tokens.get(mint) || null;
  }

  /**
   * Add custom token
   */
  public async addCustomToken(mint: string): Promise<TokenMetadata> {
    // Validate mint address
    try {
      new PublicKey(mint);
    } catch {
      throw new NocturaError('INVALID_MINT', 'Invalid token mint address');
    }

    // Check if already exists
    if (this.tokens.has(mint) || this.customTokens.has(mint)) {
      const existing = this.tokens.get(mint) || this.customTokens.get(mint);
      if (existing) return existing;
    }

    // Fetch token metadata from chain (placeholder)
    // In production, fetch from Solana RPC using getMint()
    const metadata: TokenMetadata = {
      mint,
      name: 'Custom Token',
      symbol: 'CUSTOM',
      decimals: 9, // Default, should be fetched
      verified: false,
      tags: ['custom'],
    };

    this.customTokens.set(mint, metadata);
    return metadata;
  }

  /**
   * Remove custom token
   */
  public removeCustomToken(mint: string): void {
    this.customTokens.delete(mint);
  }

  /**
   * Get all tokens
   */
  public getAllTokens(): TokenMetadata[] {
    const official = Array.from(this.tokens.values());
    const custom = Array.from(this.customTokens.values());
    return [...official, ...custom];
  }

  /**
   * Get verified tokens only
   */
  public getVerifiedTokens(): TokenMetadata[] {
    return Array.from(this.tokens.values()).filter((token) => token.verified);
  }

  /**
   * Search tokens by name or symbol
   */
  public searchTokens(query: string): TokenMetadata[] {
    const lowerQuery = query.toLowerCase();
    const allTokens = this.getAllTokens();

    return allTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(lowerQuery) ||
        token.symbol.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Check if token is verified
   */
  public isVerified(mint: string): boolean {
    const token = this.tokens.get(mint);
    return token?.verified || false;
  }

  /**
   * Get custom tokens
   */
  public getCustomTokens(): TokenMetadata[] {
    return Array.from(this.customTokens.values());
  }

  /**
   * Check if cache should be refreshed
   */
  private shouldRefreshCache(): boolean {
    if (!this.lastUpdate) return true;
    const now = Date.now();
    const lastUpdateTime = this.lastUpdate.getTime();
    return now - lastUpdateTime > this.cacheExpiry;
  }

  /**
   * Force refresh token list
   */
  public async refresh(): Promise<void> {
    await this.loadTokenList();
  }

  /**
   * Get popular tokens (top by market cap or usage)
   */
  public getPopularTokens(limit: number = 10): TokenMetadata[] {
    // Placeholder: In production, sort by market cap or trading volume
    return this.getVerifiedTokens().slice(0, limit);
  }

  /**
   * Check for known scam tokens
   */
  public isScamToken(mint: string): boolean {
    // Placeholder: Implement scam token detection
    // Could check against blacklist, unusual patterns, etc.
    return false;
  }

  /**
   * Get token count
   */
  public getTokenCount(): { total: number; verified: number; custom: number } {
    return {
      total: this.tokens.size + this.customTokens.size,
      verified: Array.from(this.tokens.values()).filter((t) => t.verified).length,
      custom: this.customTokens.size,
    };
  }
}
