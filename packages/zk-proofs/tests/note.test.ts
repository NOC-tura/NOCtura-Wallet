/**
 * Unit tests for Note operations
 */

import {
  createNote,
  recomputeCommitment,
  verifyNoteIntegrity,
  computeNoteNullifier,
  makeSpendable,
  serializeNote,
  deserializeNote,
  selectNotesForSpending,
  computeTotalValue,
  filterNotesByAsset,
  AssetType,
  type Note,
  type SpendableNote,
} from '../src/circuits/note';
import { generateRandomness } from '../src/circuits/poseidon';

describe('Note Operations', () => {
  const testOwner = 12345678901234567890n;
  const testValue = 1000000000n; // 1 SOL in lamports
  const testSecretKey = generateRandomness();

  describe('createNote', () => {
    it('should create SOL note with valid commitment', () => {
      const note = createNote(testOwner, testValue);
      
      expect(note.owner).toBe(testOwner);
      expect(note.value).toBe(testValue);
      expect(note.assetType).toBe(0n);
      expect(typeof note.commitment).toBe('bigint');
      expect(typeof note.randomness).toBe('bigint');
    });

    it('should create SPL token note', () => {
      const mintAddress = 'So11111111111111111111111111111111111111112';
      const note = createNote(testOwner, testValue, mintAddress);
      
      expect(note.assetMint).toBe(mintAddress);
      expect(note.assetType).not.toBe(0n);
    });

    it('should accept owner as Uint8Array', () => {
      const ownerBytes = new Uint8Array(32);
      ownerBytes[0] = 0xff;
      
      const note = createNote(ownerBytes, testValue);
      
      expect(note.owner).toBeGreaterThan(0n);
    });

    it('should generate unique randomness each time', () => {
      const note1 = createNote(testOwner, testValue);
      const note2 = createNote(testOwner, testValue);
      
      expect(note1.randomness).not.toBe(note2.randomness);
      expect(note1.commitment).not.toBe(note2.commitment);
    });
  });

  describe('recomputeCommitment', () => {
    it('should match original commitment', () => {
      const note = createNote(testOwner, testValue);
      const recomputed = recomputeCommitment(note);
      
      expect(recomputed).toBe(note.commitment);
    });
  });

  describe('verifyNoteIntegrity', () => {
    it('should return true for valid note', () => {
      const note = createNote(testOwner, testValue);
      expect(verifyNoteIntegrity(note)).toBe(true);
    });

    it('should return false for tampered note', () => {
      const note = createNote(testOwner, testValue);
      const tamperedNote = { ...note, value: note.value + 1n };
      
      expect(verifyNoteIntegrity(tamperedNote)).toBe(false);
    });
  });

  describe('computeNoteNullifier', () => {
    it('should compute deterministic nullifier', () => {
      const note = createNote(testOwner, testValue);
      const leafIndex = 42;
      
      const nullifier1 = computeNoteNullifier(note, testSecretKey, leafIndex);
      const nullifier2 = computeNoteNullifier(note, testSecretKey, leafIndex);
      
      expect(nullifier1).toBe(nullifier2);
    });

    it('should produce different nullifiers for different indices', () => {
      const note = createNote(testOwner, testValue);
      
      const nullifier1 = computeNoteNullifier(note, testSecretKey, 0);
      const nullifier2 = computeNoteNullifier(note, testSecretKey, 1);
      
      expect(nullifier1).not.toBe(nullifier2);
    });
  });

  describe('makeSpendable', () => {
    it('should create spendable note with nullifier', () => {
      const note = createNote(testOwner, testValue);
      const leafIndex = 5;
      
      const spendable = makeSpendable(note, testSecretKey, leafIndex);
      
      expect(spendable.leafIndex).toBe(leafIndex);
      expect(typeof spendable.nullifier).toBe('bigint');
      expect(spendable.commitment).toBe(note.commitment);
    });

    it('should throw if note already has different leaf index', () => {
      const note = createNote(testOwner, testValue);
      (note as any).leafIndex = 10;
      
      expect(() => makeSpendable(note, testSecretKey, 5)).toThrow();
    });
  });

  describe('serializeNote / deserializeNote', () => {
    it('should round-trip correctly', () => {
      const note = createNote(testOwner, testValue, 'TestMint123');
      note.leafIndex = 42;
      
      const serialized = serializeNote(note);
      const deserialized = deserializeNote(serialized);
      
      expect(deserialized.commitment).toBe(note.commitment);
      expect(deserialized.owner).toBe(note.owner);
      expect(deserialized.value).toBe(note.value);
      expect(deserialized.randomness).toBe(note.randomness);
      expect(deserialized.assetType).toBe(note.assetType);
      expect(deserialized.assetMint).toBe(note.assetMint);
      expect(deserialized.leafIndex).toBe(note.leafIndex);
    });
  });

  describe('selectNotesForSpending', () => {
    function createSpendableNotes(values: bigint[]): SpendableNote[] {
      return values.map((value, index) => {
        const note = createNote(testOwner, value);
        return makeSpendable(note, testSecretKey, index);
      });
    }

    it('should find exact match', () => {
      const notes = createSpendableNotes([100n, 200n, 300n]);
      const result = selectNotesForSpending(notes, 200n);
      
      expect(result).not.toBeNull();
      expect(result!.selected.length).toBe(1);
      expect(result!.selected[0].value).toBe(200n);
      expect(result!.change).toBe(0n);
    });

    it('should select multiple notes if needed', () => {
      const notes = createSpendableNotes([100n, 200n, 300n]);
      const result = selectNotesForSpending(notes, 400n);
      
      expect(result).not.toBeNull();
      expect(computeTotalValue(result!.selected)).toBeGreaterThanOrEqual(400n);
    });

    it('should return null for insufficient funds', () => {
      const notes = createSpendableNotes([100n, 200n]);
      const result = selectNotesForSpending(notes, 500n);
      
      expect(result).toBeNull();
    });

    it('should calculate correct change', () => {
      const notes = createSpendableNotes([500n]);
      const result = selectNotesForSpending(notes, 300n, false);
      
      expect(result).not.toBeNull();
      expect(result!.change).toBe(200n);
    });
  });

  describe('computeTotalValue', () => {
    it('should sum note values', () => {
      const notes = [
        createNote(testOwner, 100n),
        createNote(testOwner, 200n),
        createNote(testOwner, 300n),
      ];
      
      expect(computeTotalValue(notes)).toBe(600n);
    });

    it('should return 0 for empty array', () => {
      expect(computeTotalValue([])).toBe(0n);
    });
  });

  describe('filterNotesByAsset', () => {
    it('should filter SOL notes', () => {
      const solNote = createNote(testOwner, 100n);
      const splNote = createNote(testOwner, 200n, 'TokenMint');
      
      const filtered = filterNotesByAsset([solNote, splNote]);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].assetType).toBe(0n);
    });

    it('should filter by specific mint', () => {
      const mint = 'SpecificMint123';
      const note1 = createNote(testOwner, 100n, mint);
      const note2 = createNote(testOwner, 200n, 'OtherMint');
      const note3 = createNote(testOwner, 300n);
      
      const filtered = filterNotesByAsset([note1, note2, note3], mint);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].assetMint).toBe(mint);
    });
  });
});
