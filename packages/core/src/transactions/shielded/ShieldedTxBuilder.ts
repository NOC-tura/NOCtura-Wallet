import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { isValidSolanaAddress } from '../../utils/Validation';
import type {
  ShieldedTransferParams,
  ShieldedDepositParams,
  ShieldedWithdrawalParams,
  ProofResult,
} from './types';
import type { PriorityLevel } from '../../types';
import type { IProverClient } from '../../zk/ProverClient';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export class ShieldedTxBuilder {
  constructor(private connection: Connection, private prover: IProverClient) {}

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
}
