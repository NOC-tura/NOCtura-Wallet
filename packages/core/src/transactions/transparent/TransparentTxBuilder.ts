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
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { validateAddress, validateAmount } from '../../utils/Validation';
import { NocturaError, InsufficientFundsError } from '../../types';
import { FeeEstimator, PriorityLevel } from '../fee/FeeEstimator';

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

export interface SimulationResult {
  success: boolean;
  logs?: string[];
  unitsConsumed?: number;
  error?: string;
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
    // Placeholder: Implement compute budget instruction
    // This will add ComputeBudgetProgram.setComputeUnitPrice instruction
    
    return transaction;
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
