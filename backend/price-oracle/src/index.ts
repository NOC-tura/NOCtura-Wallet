/**
 * Noctura Price Oracle Service
 * 
 * Fetches and caches token prices.
 * TODO: Implement full price oracle system
 */

export const PRICE_ORACLE_VERSION = '0.1.0';

export interface PriceOracleConfig {
  sources: string[];
  cacheTtlMs: number;
  baseCurrency: string;
}

export interface TokenPrice {
  mint: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  timestamp: Date;
}

export class PriceOracle {
  private config: PriceOracleConfig;
  private cache: Map<string, TokenPrice> = new Map();

  constructor(config: PriceOracleConfig) {
    this.config = config;
  }

  async getPrice(mint: string): Promise<TokenPrice | null> {
    // Check cache first
    const cached = this.cache.get(mint);
    if (cached && Date.now() - cached.timestamp.getTime() < this.config.cacheTtlMs) {
      return cached;
    }
    
    // TODO: Fetch from price sources
    return null;
  }

  async getPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
    const result = new Map<string, TokenPrice>();
    for (const mint of mints) {
      const price = await this.getPrice(mint);
      if (price) {
        result.set(mint, price);
      }
    }
    return result;
  }
}

export default PriceOracle;
