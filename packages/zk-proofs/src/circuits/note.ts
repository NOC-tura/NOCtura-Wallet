/**
 * Note Structure and Operations for Shielded Transactions
 * 
 * A Note represents a discrete amount of value that can be spent privately.
 * Notes are created by deposits and transfers, and consumed by withdrawals and transfers.
 */

import {
  computeNoteCommitment,
  computeNullifier,
  generateRandomness,
  bufferToBigInt,
  bigIntToBuffer,
  type PoseidonHash,
} from './poseidon';

/**
 * Asset types supported by the protocol
 */
export enum AssetType {
  SOL = 0,
  SPL_TOKEN = 1,
}

/**
 * Internal note representation with all cryptographic components
 */
export interface Note {
  // Public data (on-chain)
  commitment: bigint;
  
  // Private data (known only to owner)
  owner: bigint;           // Owner's public key as bigint
  value: bigint;           // Value in lamports
  randomness: bigint;      // Blinding factor
  assetType: bigint;       // 0 for SOL, mint address hash for SPL tokens
  assetMint?: string;      // Original mint address for SPL tokens
  
  // Tree position (set after insertion)
  leafIndex?: number;
}

/**
 * Serialized note for storage/transmission
 */
export interface SerializedNote {
  commitment: string;
  owner: string;
  value: string;
  randomness: string;
  assetType: string;
  assetMint?: string;
  leafIndex?: number;
}

/**
 * Note with computed nullifier
 */
export interface SpendableNote extends Note {
  nullifier: bigint;
  leafIndex: number;
}

/**
 * Create a new note
 */
export function createNote(
  ownerPubkey: Uint8Array | bigint,
  value: bigint,
  assetMint?: string
): Note {
  const owner = typeof ownerPubkey === 'bigint' 
    ? ownerPubkey 
    : bufferToBigInt(ownerPubkey);
  
  const randomness = generateRandomness();
  
  // For SPL tokens, hash the mint address to get asset type
  let assetType = 0n;
  if (assetMint) {
    // Simple hash of mint address - in production use proper domain separation
    const mintBytes = new TextEncoder().encode(assetMint);
    assetType = bufferToBigInt(mintBytes) % (2n ** 64n);
  }
  
  const commitment = computeNoteCommitment(owner, value, randomness, assetType);
  
  return {
    commitment,
    owner,
    value,
    randomness,
    assetType,
    assetMint,
  };
}

/**
 * Recompute commitment for a note (for verification)
 */
export function recomputeCommitment(note: Note): bigint {
  return computeNoteCommitment(
    note.owner,
    note.value,
    note.randomness,
    note.assetType
  );
}

/**
 * Verify that a note's commitment is correctly computed
 */
export function verifyNoteIntegrity(note: Note): boolean {
  const computed = recomputeCommitment(note);
  return computed === note.commitment;
}

/**
 * Compute nullifier for spending a note
 */
export function computeNoteNullifier(
  note: Note,
  secretKey: bigint,
  leafIndex: number
): bigint {
  return computeNullifier(note.commitment, secretKey, BigInt(leafIndex));
}

/**
 * Convert note to spendable note (adds nullifier)
 */
export function makeSpendable(
  note: Note,
  secretKey: bigint,
  leafIndex: number
): SpendableNote {
  if (note.leafIndex !== undefined && note.leafIndex !== leafIndex) {
    throw new Error('Note already has a different leaf index');
  }
  
  const nullifier = computeNoteNullifier(note, secretKey, leafIndex);
  
  return {
    ...note,
    leafIndex,
    nullifier,
  };
}

/**
 * Serialize a note for storage
 */
export function serializeNote(note: Note): SerializedNote {
  return {
    commitment: note.commitment.toString(),
    owner: note.owner.toString(),
    value: note.value.toString(),
    randomness: note.randomness.toString(),
    assetType: note.assetType.toString(),
    assetMint: note.assetMint,
    leafIndex: note.leafIndex,
  };
}

/**
 * Deserialize a note from storage
 */
export function deserializeNote(data: SerializedNote): Note {
  return {
    commitment: BigInt(data.commitment),
    owner: BigInt(data.owner),
    value: BigInt(data.value),
    randomness: BigInt(data.randomness),
    assetType: BigInt(data.assetType),
    assetMint: data.assetMint,
    leafIndex: data.leafIndex,
  };
}

/**
 * Encrypt note data for storage (simplified - use proper encryption in production)
 * The owner's viewing key should be used to derive the encryption key
 */
export function encryptNoteData(
  note: Note,
  encryptionKey: Uint8Array
): Uint8Array {
  // Simplified XOR encryption - replace with proper AEAD in production
  const plaintext = JSON.stringify(serializeNote(note));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ encryptionKey[i % encryptionKey.length];
  }
  
  return encrypted;
}

/**
 * Decrypt note data
 */
export function decryptNoteData(
  encrypted: Uint8Array,
  encryptionKey: Uint8Array
): Note {
  const decrypted = new Uint8Array(encrypted.length);
  
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ encryptionKey[i % encryptionKey.length];
  }
  
  const plaintext = new TextDecoder().decode(decrypted);
  return deserializeNote(JSON.parse(plaintext));
}

/**
 * Select notes to spend for a given amount
 * Uses a simple greedy algorithm - can be optimized for privacy
 */
export function selectNotesForSpending(
  notes: SpendableNote[],
  targetAmount: bigint,
  preferExact: boolean = true
): { selected: SpendableNote[]; change: bigint } | null {
  // Sort by value descending
  const sorted = [...notes].sort((a, b) => 
    Number(b.value - a.value)
  );
  
  // Try to find exact match first
  if (preferExact) {
    for (const note of sorted) {
      if (note.value === targetAmount) {
        return { selected: [note], change: 0n };
      }
    }
    
    // Try combinations of 2 notes
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].value + sorted[j].value === targetAmount) {
          return { selected: [sorted[i], sorted[j]], change: 0n };
        }
      }
    }
  }
  
  // Greedy selection
  const selected: SpendableNote[] = [];
  let total = 0n;
  
  for (const note of sorted) {
    if (total >= targetAmount) break;
    selected.push(note);
    total += note.value;
  }
  
  if (total < targetAmount) {
    return null; // Insufficient funds
  }
  
  return {
    selected,
    change: total - targetAmount,
  };
}

/**
 * Compute total value of notes
 */
export function computeTotalValue(notes: Note[]): bigint {
  return notes.reduce((sum, note) => sum + note.value, 0n);
}

/**
 * Filter notes by asset type
 */
export function filterNotesByAsset(
  notes: Note[],
  assetMint?: string
): Note[] {
  if (!assetMint) {
    return notes.filter(n => n.assetType === 0n);
  }
  return notes.filter(n => n.assetMint === assetMint);
}
