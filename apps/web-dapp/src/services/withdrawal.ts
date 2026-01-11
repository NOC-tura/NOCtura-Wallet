import { selectNotesForAmount } from '../utils/noteSelection';
import { SOL_FEE_LAMPORTS } from '../utils/fees';
import { formatNOC, formatSOL } from '../utils/format';
import type { NoteDatabase, ShieldedNote } from '../types/note';
import { generateSecureRandomBytes } from '../utils/crypto';

const FEE_COLLECTOR = 'FEE_COLLECTOR';

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
  // Placeholder stub for integration with prover service
  const proofId = randomHex(16);
  return { proof: `proof_${proofId}`, publicSignals: [String(payload.inputs.length), String(payload.outputs.length)] };
}

async function submitShieldedTransaction(proof: { proof: string; publicSignals: string[] }): Promise<string> {
  // Placeholder submission. In production, call relayer/cluster.
  const signature = `shielded_${proof.proof}_${Date.now()}`;
  return signature;
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
