/**
 * Transparent Swap Engine
 * Handles token swaps using Jupiter aggregator or other DEXs
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  SwapQuote,
  SwapConfig,
  SwapResult,
  SwapTransaction,
  SwapStatus,
  PriceInfo,
} from './types';
import { validateAddress, validateAmount } from '../utils/Validation';
import { NocturaError } from '../types';
import { SWAP } from '../utils/Constants';

/**
 * Transparent Swap Engine
 */
export class TransparentSwapEngine {
  private connection: Connection;
  private jupiterApiUrl: string = 'https://quote-api.jup.ag/v6';

  constructor(connection: Connection, jupiterApiUrl?: string) {
    this.connection = connection;
    if (jupiterApiUrl) {
      this.jupiterApiUrl = jupiterApiUrl;
    }
  }

  /**
   * Get swap quote from Jupiter aggregator
   */
  public async getQuote(
    inputMint: string,
    outputMint: string,
    amount: bigint,
    slippageBps: number = SWAP.DEFAULT_SLIPPAGE * 100
  ): Promise<SwapQuote> {
    validateAddress(inputMint);
    validateAddress(outputMint);
    validateAmount(Number(amount));

    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
      });

      const response = await fetch(`${this.jupiterApiUrl}/quote?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        inputMint,
        outputMint,
        inAmount: BigInt(data.inAmount || amount),
        outAmount: BigInt(data.outAmount || 0),
        otherAmountThreshold: BigInt(data.otherAmountThreshold || 0),
        swapMode: data.swapMode || 'ExactIn',
        slippageBps,
        priceImpactPct: parseFloat(data.priceImpactPct || '0'),
        routePlan: data.routePlan || [],
        contextSlot: data.contextSlot,
        timeTaken: data.timeTaken,
      };
    } catch (error) {
      console.error('Quote fetch error:', error);
      throw new NocturaError(
        'SWAP_QUOTE_FAILED',
        `Failed to fetch swap quote: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get swap transaction from quote
   */
  public async getSwapTransaction(
    quote: SwapQuote,
    userPublicKey: PublicKey,
    config?: SwapConfig
  ): Promise<Transaction | VersionedTransaction> {
    try {
      const body = {
        quoteResponse: quote,
        userPublicKey: userPublicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: config?.priorityFee,
        asLegacyTransaction: true, // Use legacy transaction for compatibility
      };

      const response = await fetch(`${this.jupiterApiUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { swapTransaction } = await response.json();

      // Deserialize transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = Transaction.from(transactionBuf);

      return transaction;
    } catch (error) {
      console.error('Swap transaction error:', error);
      throw new NocturaError(
        'SWAP_TRANSACTION_FAILED',
        `Failed to build swap transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute swap
   */
  public async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: bigint,
    userPublicKey: PublicKey,
    config: SwapConfig = { slippageBps: SWAP.DEFAULT_SLIPPAGE * 100 }
  ): Promise<SwapTransaction> {
    // Get quote
    const quote = await this.getQuote(
      inputMint,
      outputMint,
      amount,
      config.slippageBps
    );

    // Check price impact
    if (quote.priceImpactPct > SWAP.PRICE_IMPACT_WARNING) {
      console.warn(`High price impact: ${quote.priceImpactPct}%`);
      
      if (quote.priceImpactPct > SWAP.PRICE_IMPACT_BLOCK) {
        throw new NocturaError(
          'PRICE_IMPACT_TOO_HIGH',
          `Price impact ${quote.priceImpactPct}% exceeds maximum allowed ${SWAP.PRICE_IMPACT_BLOCK}%`
        );
      }
    }

    // Build transaction
    const transaction = await this.getSwapTransaction(quote, userPublicKey, config);

    // Create swap record
    const swapTx: SwapTransaction = {
      id: this.generateId(),
      status: SwapStatus.PENDING,
      inputMint,
      outputMint,
      inputAmount: amount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      fee: 0, // Will be updated after execution
      timestamp: new Date(),
    };

    // Note: Transaction needs to be signed and sent by the caller
    // This engine just prepares the transaction

    return swapTx;
  }

  /**
   * Get token price in USD
   */
  public async getTokenPrice(mint: string): Promise<PriceInfo | null> {
    try {
      const response = await fetch(`${this.jupiterApiUrl}/price?ids=${mint}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const priceData = data.data[mint];

      if (!priceData) {
        return null;
      }

      return {
        mint,
        price: priceData.price || 0,
        priceChange24h: priceData.priceChange24h || 0,
        volume24h: priceData.volume24h || 0,
        marketCap: priceData.marketCap || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Price fetch error:', error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens
   */
  public async getTokenPrices(mints: string[]): Promise<Map<string, PriceInfo>> {
    const prices = new Map<string, PriceInfo>();
    
    try {
      const ids = mints.join(',');
      const response = await fetch(`${this.jupiterApiUrl}/price?ids=${ids}`);
      
      if (!response.ok) {
        return prices;
      }

      const data = await response.json();

      for (const mint of mints) {
        const priceData = data.data[mint];
        if (priceData) {
          prices.set(mint, {
            mint,
            price: priceData.price || 0,
            priceChange24h: priceData.priceChange24h || 0,
            volume24h: priceData.volume24h || 0,
            marketCap: priceData.marketCap || 0,
            lastUpdated: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Prices fetch error:', error);
    }

    return prices;
  }

  /**
   * Calculate minimum output amount based on slippage
   */
  public calculateMinOutput(
    outputAmount: bigint,
    slippageBps: number
  ): bigint {
    const slippage = BigInt(slippageBps);
    const bps = BigInt(10000);
    return (outputAmount * (bps - slippage)) / bps;
  }

  /**
   * Validate swap parameters
   */
  public validateSwapParams(
    inputMint: string,
    outputMint: string,
    amount: bigint,
    slippageBps: number
  ): void {
    validateAddress(inputMint);
    validateAddress(outputMint);
    validateAmount(Number(amount));

    if (inputMint === outputMint) {
      throw new NocturaError('INVALID_SWAP', 'Input and output tokens must be different');
    }

    if (slippageBps < SWAP.MIN_SLIPPAGE * 100 || slippageBps > SWAP.MAX_SLIPPAGE * 100) {
      throw new NocturaError(
        'INVALID_SLIPPAGE',
        `Slippage must be between ${SWAP.MIN_SLIPPAGE}% and ${SWAP.MAX_SLIPPAGE}%`
      );
    }
  }

  /**
   * Estimate swap output
   */
  public async estimateOutput(
    inputMint: string,
    outputMint: string,
    amount: bigint
  ): Promise<bigint> {
    const quote = await this.getQuote(inputMint, outputMint, amount);
    return quote.outAmount;
  }

  /**
   * Get supported tokens for swapping
   */
  public async getSupportedTokens(): Promise<string[]> {
    try {
      const response = await fetch(`${this.jupiterApiUrl}/tokens`);
      
      if (!response.ok) {
        return [];
      }

      const tokens = await response.json();
      return tokens.map((token: any) => token.address);
    } catch (error) {
      console.error('Supported tokens fetch error:', error);
      return [];
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
