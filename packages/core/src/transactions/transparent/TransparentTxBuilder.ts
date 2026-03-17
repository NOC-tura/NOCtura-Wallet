/**
 * Transparent Transaction Builder
 * Build standard Solana transactions (SOL and SPL token transfers)
 */

import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import { validateAddress, validateAmount } from '../../utils/Validation';
import { NocturaError, InsufficientFundsError, PriorityLevel } from '../../types';
import { FeeEstimator } from '../fee/FeeEstimator';

export interface TransferParams {
  from: PublicKey;
  to: string;
  amount: number; // in lamports for SOL
}

export interface TokenTransferParams {
  from: PublicKey;
  to: string;
  mint: string;
  amount: number;
  decimals: number;
}

export interface BatchTransferParams {
  from: PublicKey;
  transfers: Array<{
    to: string;
    amount: number;
  }>;
}

export interface SimulationResult {
  success: boolean;
  logs?: string[];
  unitsConsumed?: number;
  error?: string;
}

export interface SendTransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface TransactionResult {
  signature: string;
  confirmations: number;
  slot: number;
}

/**
 * Transparent Transaction Builder
 */
export class TransparentTxBuilder {
  private connection: Connection;
  private feeEstimator: FeeEstimator;

  constructor(connection: Connection) {
    this.connection = connection;
    this.feeEstimator = new FeeEstimator(connection);
  }

  /**
   * Build SOL transfer transaction
   */
  public async buildTransfer(params: TransferParams): Promise<Transaction> {
    validateAddress(params.to);
    validateAmount(params.amount);

    const toPubkey = new PublicKey(params.to);

    // Check balance
    const balance = await this.connection.getBalance(params.from);
    const fees = await this.feeEstimator.estimateFee(
      new Transaction(),
      'medium'
    );

    if (balance < params.amount + fees.totalFee) {
      throw new InsufficientFundsError(
        `Insufficient balance. Required: ${
          (params.amount + fees.totalFee) / LAMPORTS_PER_SOL
        } SOL, Available: ${balance / LAMPORTS_PER_SOL} SOL`
      );
    }

    // Create transaction
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: params.from,
        toPubkey: toPubkey,
        lamports: params.amount,
      })
    );

    // Add recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = params.from;

    return transaction;
  }

  /**
   * Build SPL token transfer transaction
   */
  public async buildTokenTransfer(
    params: TokenTransferParams
  ): Promise<Transaction> {
    validateAddress(params.to);
    validateAddress(params.mint);
    validateAmount(params.amount);

    const toPubkey = new PublicKey(params.to);
    const mintPubkey = new PublicKey(params.mint);

    // Get source token account
    const sourceTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      params.from
    );

    // Get destination token account
    const destTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      toPubkey
    );

    const transaction = new Transaction();

    // Check if destination token account exists
    const destAccountInfo = await this.connection.getAccountInfo(destTokenAccount);
    
    if (!destAccountInfo) {
      // Create associated token account for recipient
      transaction.add(
        createAssociatedTokenAccountInstruction(
          params.from, // payer
          destTokenAccount,
          toPubkey, // owner
          mintPubkey
        )
      );
    }

    // Add transfer instruction
    const transferAmount = BigInt(Math.floor(params.amount * Math.pow(10, params.decimals)));
    
    transaction.add(
      createTransferInstruction(
        sourceTokenAccount,
        destTokenAccount,
        params.from,
        transferAmount
      )
    );

    // Add recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = params.from;

    return transaction;
  }

  /**
   * Add priority fee to transaction
   */
  public addPriorityFee(
    transaction: Transaction,
    priorityLevel: PriorityLevel
  ): Transaction {
    // Get compute unit price based on priority level
    const microLamports = this.getComputeUnitPrice(priorityLevel);
    
    // Add compute budget instructions at the beginning
    const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    });
    
    // Estimate compute units (default 200k for simple transfers)
    const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    });
    
    // Prepend compute budget instructions
    transaction.instructions = [
      computeUnitPriceIx,
      computeUnitLimitIx,
      ...transaction.instructions,
    ];
    
    return transaction;
  }

  /**
   * Get compute unit price in micro-lamports
   */
  private getComputeUnitPrice(level: PriorityLevel): number {
    switch (level) {
      case 'low':
        return 1_000;
      case 'medium':
        return 10_000;
      case 'high':
        return 100_000;
      default:
        return 10_000;
    }
  }

  /**
   * Build batch SOL transfer transaction (multiple recipients)
   */
  public async buildBatchTransfer(params: BatchTransferParams): Promise<Transaction> {
    if (params.transfers.length === 0) {
      throw new NocturaError('INVALID_TRANSACTION', 'No transfers provided');
    }
    
    if (params.transfers.length > 20) {
      throw new NocturaError('INVALID_TRANSACTION', 'Maximum 20 transfers per batch');
    }

    // Validate all recipients
    for (const transfer of params.transfers) {
      validateAddress(transfer.to);
      validateAmount(transfer.amount);
    }

    const totalAmount = params.transfers.reduce((sum, t) => sum + t.amount, 0);
    
    // Check balance
    const balance = await this.connection.getBalance(params.from);
    const fees = await this.feeEstimator.estimateFee(
      new Transaction(),
      'medium'
    );
    
    // Multiply fee estimate by number of transfers
    const estimatedFees = fees.totalFee * params.transfers.length;

    if (balance < totalAmount + estimatedFees) {
      throw new InsufficientFundsError(
        `Insufficient balance. Required: ${(totalAmount + estimatedFees) / LAMPORTS_PER_SOL} SOL`
      );
    }

    const transaction = new Transaction();
    
    for (const transfer of params.transfers) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: params.from,
          toPubkey: new PublicKey(transfer.to),
          lamports: transfer.amount,
        })
      );
    }

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = params.from;

    return transaction;
  }

  /**
   * Sign and send transaction
   */
  public async sendTransaction(
    transaction: Transaction,
    signer: Keypair,
    options: SendTransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      skipPreflight = false,
      maxRetries = 3,
      commitment = 'confirmed',
    } = options;

    // Sign the transaction
    transaction.sign(signer);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight,
            maxRetries: 0, // We handle retries ourselves
          }
        );

        // Wait for confirmation
        const confirmation = await this.connection.confirmTransaction(
          {
            signature,
            blockhash: transaction.recentBlockhash!,
            lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight,
          },
          commitment
        );

        if (confirmation.value.err) {
          throw new NocturaError(
            'TRANSACTION_FAILED',
            `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
          );
        }

        // Get transaction details
        const txDetails = await this.connection.getTransaction(signature, {
          commitment: 'confirmed',
        });

        return {
          signature,
          confirmations: txDetails?.slot ? 1 : 0,
          slot: txDetails?.slot || 0,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain errors
        if (
          lastError.message.includes('insufficient funds') ||
          lastError.message.includes('already processed')
        ) {
          throw lastError;
        }
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          
          // Refresh blockhash
          const { blockhash } = await this.connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.sign(signer);
        }
      }
    }

    throw new NocturaError(
      'TRANSACTION_FAILED',
      `Transaction failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Get SOL balance for an address
   */
  public async getBalance(address: PublicKey | string): Promise<number> {
    const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
    return this.connection.getBalance(pubkey);
  }

  /**
   * Get token balance for an address
   */
  public async getTokenBalance(
    owner: PublicKey | string,
    mint: PublicKey | string
  ): Promise<{ amount: bigint; decimals: number; uiAmount: number }> {
    const ownerPubkey = typeof owner === 'string' ? new PublicKey(owner) : owner;
    const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint;

    const tokenAccount = await getAssociatedTokenAddress(mintPubkey, ownerPubkey);
    
    try {
      const account = await getAccount(this.connection, tokenAccount);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
      const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
      
      return {
        amount: account.amount,
        decimals,
        uiAmount: Number(account.amount) / Math.pow(10, decimals),
      };
    } catch (error) {
      // Token account doesn't exist
      return { amount: BigInt(0), decimals: 9, uiAmount: 0 };
    }
  }

  /**
   * Simulate transaction before signing
   */
  public async simulateTransaction(
    transaction: Transaction
  ): Promise<SimulationResult> {
    try {
      const simulation = await this.connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        return {
          success: false,
          error: JSON.stringify(simulation.value.err),
          logs: simulation.value.logs || [],
        };
      }

      return {
        success: true,
        logs: simulation.value.logs || [],
        unitsConsumed: simulation.value.unitsConsumed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
      };
    }
  }

  /**
   * Build transaction with multiple instructions
   */
  public async buildMultiInstruction(
    instructions: TransactionInstruction[],
    feePayer: PublicKey
  ): Promise<Transaction> {
    if (instructions.length === 0) {
      throw new NocturaError('INVALID_TRANSACTION', 'No instructions provided');
    }

    const transaction = new Transaction();
    transaction.add(...instructions);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer;

    return transaction;
  }

  /**
   * Estimate total cost of transaction
   */
  public async estimateTransactionCost(
    transaction: Transaction,
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<number> {
    const fees = await this.feeEstimator.estimateFee(transaction, priorityLevel);
    return fees.totalFee;
  }

  /**
   * Validate transaction before submission
   */
  public async validateTransaction(transaction: Transaction): Promise<boolean> {
    // Check if transaction has recent blockhash
    if (!transaction.recentBlockhash) {
      throw new NocturaError('INVALID_TRANSACTION', 'Missing recent blockhash');
    }

    // Check if transaction has fee payer
    if (!transaction.feePayer) {
      throw new NocturaError('INVALID_TRANSACTION', 'Missing fee payer');
    }

    // Check if transaction has instructions
    if (transaction.instructions.length === 0) {
      throw new NocturaError('INVALID_TRANSACTION', 'No instructions in transaction');
    }

    // Simulate to check for errors
    const simulation = await this.simulateTransaction(transaction);
    if (!simulation.success) {
      throw new NocturaError(
        'TRANSACTION_VALIDATION_FAILED',
        `Transaction validation failed: ${simulation.error}`
      );
    }

    return true;
  }
}
