import { selectNotesForAmount } from '../utils/noteSelection';
import { SOL_FEE_LAMPORTS } from '../utils/fees';
import { formatNOC, formatSOL } from '../utils/format';
import type { NoteDatabase, ShieldedNote } from '../types/note';
import { generateSecureRandomBytes } from '../utils/crypto';
import { createProverClient, type IProverClient, type ProverConfig } from '@noctura/sdk';

const FEE_COLLECTOR = 'FEE_COLLECTOR';

// Prover client instance - can be configured via setProverConfig
let proverClient: IProverClient | null = null;
let proverConfig: ProverConfig = { type: 'noop' }; // Default to noop for development

/**
 * Configure the prover client for withdrawal operations
 */
export function setProverConfig(config: ProverConfig): void {
  proverConfig = config;
  proverClient = null; // Reset client to be re-created with new config
}

/**
 * Get or create the prover client instance
 */
function getProverClient(): IProverClient {
  if (!proverClient) {
    proverClient = createProverClient({
      type: proverConfig.type,
      remoteUrl: proverConfig.endpoint,
      timeout: proverConfig.timeout,
    });
  }
  return proverClient!;
}

export interface TransactionResult {
  success: boolean;
  signature: string;
  notesConsumed: number;
  amountSent: bigint;
  feePaid: bigint;
  nocFeePaid: bigint;
  change: bigint;
}

interface ProofPayload {
  inputs: ShieldedNote[];
  outputs: Array<{ recipient: string; amount: bigint; token: 'SOL' | 'NOC' }>;
}

export async function withdrawFromShielded(
  senderAddress: string,
  recipientAddress: string,
  requestedAmount: bigint,
  noteDatabase: NoteDatabase
): Promise<TransactionResult> {
  const nocNotes = noteDatabase.getUnspentNotes(senderAddress, 'NOC');
  const totalNOC = nocNotes.reduce((sum, note) => sum + note.amount, 0n);
  const REQUIRED_NOC = 250_000_000n; // 0.25 NOC with 9 decimals

  if (totalNOC < REQUIRED_NOC) {
    throw new Error(`Insufficient NOC. Required: 0.25 NOC, Available: ${formatNOC(totalNOC)} NOC`);
  }

  const solNotes = noteDatabase.getUnspentNotes(senderAddress, 'SOL');
  const totalSOL = solNotes.reduce((sum, note) => sum + note.amount, 0n);

  const totalNeeded = requestedAmount + BigInt(SOL_FEE_LAMPORTS);

  if (totalNeeded > totalSOL) {
    const maxSpendable = totalSOL - BigInt(SOL_FEE_LAMPORTS);
    throw new Error(`Insufficient SOL. Max withdrawable: ${formatSOL(maxSpendable)} SOL`);
  }

  const { selectedNotes, totalSelected, changeAmount } = selectNotesForAmount(totalNeeded, solNotes, 'SOL');

  const { selectedNotes: nocFeeNotes } = selectNotesForAmount(REQUIRED_NOC, nocNotes, 'NOC');

  const outputs: Array<{ recipient: string; amount: bigint; token: 'SOL' | 'NOC' }> = [
    { recipient: recipientAddress, amount: requestedAmount, token: 'SOL' },
    { recipient: FEE_COLLECTOR, amount: BigInt(SOL_FEE_LAMPORTS), token: 'SOL' },
    { recipient: FEE_COLLECTOR, amount: REQUIRED_NOC, token: 'NOC' },
  ];

  if (changeAmount > 0n) {
    outputs.push({ recipient: senderAddress, amount: changeAmount, token: 'SOL' });
  }

  const proof = await generateZKProof({ inputs: [...selectedNotes, ...nocFeeNotes], outputs });
  const txSignature = await submitShieldedTransaction(proof);

  const allSpentNoteIds = [...selectedNotes.map((n) => n.id), ...nocFeeNotes.map((n) => n.id)];
  noteDatabase.markNotesAsSpent(allSpentNoteIds, txSignature);

  if (changeAmount > 0n) {
    const changeNote: ShieldedNote = {
      id: generateNoteId(),
      amount: changeAmount,
      owner: senderAddress,
      token: 'SOL',
      nullifier: generateNullifier(),
      commitment: generateCommitment(),
      createdAt: Date.now(),
      spent: false,
      createdInTx: txSignature,
    };
    noteDatabase.addNote(changeNote);
  }

  return {
    success: true,
    signature: txSignature,
    notesConsumed: selectedNotes.length + nocFeeNotes.length,
    amountSent: requestedAmount,
    feePaid: BigInt(SOL_FEE_LAMPORTS),
    nocFeePaid: REQUIRED_NOC,
    change: changeAmount,
  };
}

async function generateZKProof(payload: ProofPayload): Promise<{ proof: string; publicSignals: string[] }> {
  const client = getProverClient();
  
  // Calculate total output amount
  const totalOutputAmount = payload.outputs.reduce((sum, out) => sum + out.amount, 0n);
  
  // Find the recipient (first non-fee-collector output)
  const recipientOutput = payload.outputs.find(out => out.recipient !== FEE_COLLECTOR);
  const recipientAddress = recipientOutput?.recipient || '';
  
  try {
    const proofResult = await client.proveWithdrawal({
      recipientAddress,
      amount: totalOutputAmount,
      assetMint: 'SOL',
      feeLevel: 'medium',
    });
    return {
      proof: proofResult.proof,
      publicSignals: proofResult.publicSignals,
    };
  } catch (error) {
    console.error('Proof generation failed:', error);
    throw new Error(`Failed to generate ZK proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function submitShieldedTransaction(proof: { proof: string; publicSignals: string[] }): Promise<string> {
  // In production, this would submit to the relayer service
  // For now, we create a transaction-like signature
  const proofHash = await hashProofData(proof);
  const signature = `shielded_tx_${proofHash}_${Date.now()}`;
  
  // TODO: Integrate with relayer service
  // const response = await fetch(`${RELAYER_URL}/submit`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ proof, publicSignals }),
  // });
  // return response.json().signature;
  
  return signature;
}

async function hashProofData(proof: { proof: string; publicSignals: string[] }): Promise<string> {
  const data = JSON.stringify(proof);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateMerkleRoot(commitments: string[]): string {
  // Placeholder merkle root - in production this would be computed from the actual tree
  const combined = commitments.join('');
  return `merkle_root_${randomHex(16)}`;
}

function randomHex(bytes: number): string {
  const buf = generateSecureRandomBytes(bytes);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateNoteId(): string {
  return `note_${randomHex(8)}`;
}

function generateNullifier(): string {
  return `nullifier_${randomHex(16)}`;
}

function generateCommitment(): string {
  return `commitment_${randomHex(16)}`;
}
