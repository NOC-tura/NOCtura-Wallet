import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';
import { isValidSolanaAddress } from '../../utils/Validation';
import type {
  ShieldedTransferParams,
  ShieldedDepositParams,
  ShieldedWithdrawalParams,
  ProofResult,
  ShieldedNote,
} from './types';
import type { PriorityLevel } from '../../types';
import type { IProverClient } from '../../zk/ProverClient';
import { FeeEstimator } from '../fee/FeeEstimator';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface ShieldedTxResult {
  transaction: Transaction;
  proof: ProofResult;
  note?: ShieldedNote;
}

export class ShieldedTxBuilder {
  private feeEstimator: FeeEstimator;

  constructor(private connection: Connection, private prover: IProverClient) {
    this.feeEstimator = new FeeEstimator(connection);
  }

  public async buildShieldedTransfer(params: ShieldedTransferParams): Promise<{ transaction: Transaction; proof: ProofResult }> {
    this.validateRecipient(params.recipientAddress);

    const proof = await this.prover.proveShieldedTransfer(params);
    const payload = {
      type: 'shielded_transfer',
      recipient: params.recipientAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint || null,
      feeLevel: params.feeLevel || 'medium',
      memo: params.memo || null,
      proof: proof.proof,
    };

    const ix = this.createMemoInstruction(payload);
    const tx = new Transaction().add(ix);
    return { transaction: tx, proof };
  }

  public async buildDeposit(params: ShieldedDepositParams): Promise<{ transaction: Transaction; proof: ProofResult }> {
    this.validateSource(params.sourceAddress);

    const proof = await this.prover.proveDeposit(params);
    const payload = {
      type: 'shielded_deposit',
      source: params.sourceAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint || null,
      feeLevel: params.feeLevel || 'medium',
      memo: params.memo || null,
      proof: proof.proof,
    };
    const ix = this.createMemoInstruction(payload);
    const tx = new Transaction().add(ix);
    return { transaction: tx, proof };
  }

  public async buildWithdrawal(params: ShieldedWithdrawalParams): Promise<{ transaction: Transaction; proof: ProofResult }> {
    this.validateRecipient(params.recipientAddress);

    const proof = await this.prover.proveWithdrawal(params);
    const payload = {
      type: 'shielded_withdrawal',
      recipient: params.recipientAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint || null,
      feeLevel: params.feeLevel || 'medium',
      memo: params.memo || null,
      proof: proof.proof,
    };
    const ix = this.createMemoInstruction(payload);
    const tx = new Transaction().add(ix);
    return { transaction: tx, proof };
  }

  public async simulate(transaction: Transaction): Promise<boolean> {
    try {
      const { value } = await this.connection.simulateTransaction(transaction);
      if (value.err) return false;
      return true;
    } catch {
      return false;
    }
  }

  private validateRecipient(address: string) {
    if (!isValidSolanaAddress(address)) {
      throw new Error('Invalid recipient address');
    }
  }

  private validateSource(address: string) {
    if (!isValidSolanaAddress(address)) {
      throw new Error('Invalid source address');
    }
  }

  private createMemoInstruction(payload: unknown): TransactionInstruction {
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    return new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data,
    });
  }

  /**
   * Generate a commitment for a shielded note
   */
  public async generateCommitment(
    amount: bigint,
    recipient: string,
    randomness?: Uint8Array
  ): Promise<string> {
    // Use prover to generate commitment
    const commitment = await this.prover.generateCommitment({
      amount,
      recipient,
      randomness: randomness || crypto.getRandomValues(new Uint8Array(32)),
    });
    return commitment;
  }

  /**
   * Generate a nullifier for a spent note
   */
  public async generateNullifier(
    commitment: string,
    secretKey: Uint8Array
  ): Promise<string> {
    const nullifier = await this.prover.generateNullifier({
      commitment,
      secretKey,
    });
    return nullifier;
  }

  /**
   * Estimate fee for shielded transaction
   */
  public async estimateFee(
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<{ baseFee: number; priorityFee: number; totalFee: number; feeInSOL: number }> {
    return this.feeEstimator.estimateShieldedFee(priorityLevel);
  }

  /**
   * Create a shielded note for deposit
   */
  public createNote(
    amount: bigint,
    commitment: string,
    assetMint?: string
  ): ShieldedNote {
    return {
      commitment,
      value: amount,
      assetMint,
    };
  }

  /**
   * Verify a proof is valid
   */
  public async verifyProof(proof: ProofResult): Promise<boolean> {
    return this.prover.verifyProof(proof);
  }

  /**
   * Build and sign a complete shielded transfer
   */
  public async buildAndSignShieldedTransfer(
    params: ShieldedTransferParams,
    signer: Keypair
  ): Promise<ShieldedTxResult> {
    const result = await this.buildShieldedTransfer(params);
    
    // Add recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    result.transaction.recentBlockhash = blockhash;
    result.transaction.feePayer = signer.publicKey;
    
    // Sign transaction
    result.transaction.sign(signer);
    
    // Create note for recipient
    const commitment = await this.generateCommitment(
      params.amount,
      params.recipientAddress
    );
    
    const note = this.createNote(params.amount, commitment, params.assetMint);
    
    return {
      ...result,
      note,
    };
  }

  /**
   * Get the connection
   */
  public getConnection(): Connection {
    return this.connection;
  }
}
