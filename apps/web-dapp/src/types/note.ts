export interface ShieldedNote {
  id: string;
  amount: bigint;
  owner: string;
  token: 'SOL' | 'NOC';
  nullifier: string;
  commitment: string;
  createdAt: number;
  spent: boolean;
  spentInTx?: string;
  createdInTx: string;
}

export interface NoteDatabase {
  notes: Map<string, ShieldedNote[]>;
  getAllNotes(owner: string, token?: 'SOL' | 'NOC'): ShieldedNote[];
  getUnspentNotes(owner: string, token: 'SOL' | 'NOC'): ShieldedNote[];
  markNotesAsSpent(noteIds: string[], txId?: string): void;
  addNote(note: ShieldedNote): void;
  getTotalBalance(owner: string, token: 'SOL' | 'NOC'): bigint;
}

export class InMemoryNoteDatabase implements NoteDatabase {
  public notes: Map<string, ShieldedNote[]> = new Map();

  getAllNotes(owner: string, token?: 'SOL' | 'NOC'): ShieldedNote[] {
    const ownerNotes = this.notes.get(owner) ?? [];
    return token ? ownerNotes.filter((note) => note.token === token) : [...ownerNotes];
  }

  getUnspentNotes(owner: string, token: 'SOL' | 'NOC'): ShieldedNote[] {
    return this.getAllNotes(owner, token).filter((note) => !note.spent);
  }

  markNotesAsSpent(noteIds: string[], txId?: string): void {
    this.notes.forEach((noteList, owner) => {
      const updated = noteList.map((note) =>
        noteIds.includes(note.id)
          ? { ...note, spent: true, spentInTx: txId ?? note.spentInTx }
          : note
      );
      this.notes.set(owner, updated);
    });
  }

  addNote(note: ShieldedNote): void {
    const ownerNotes = this.notes.get(note.owner) ?? [];
    this.notes.set(note.owner, [...ownerNotes, note]);
  }

  getTotalBalance(owner: string, token: 'SOL' | 'NOC'): bigint {
    return this.getUnspentNotes(owner, token).reduce((sum, note) => sum + note.amount, 0n);
  }
}
