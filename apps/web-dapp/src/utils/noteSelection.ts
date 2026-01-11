import type { ShieldedNote } from '../types/note';

export function selectNotesForAmount(
  requestedAmount: bigint,
  availableNotes: ShieldedNote[],
  token: 'SOL' | 'NOC'
): {
  selectedNotes: ShieldedNote[];
  totalSelected: bigint;
  changeAmount: bigint;
} {
  const validNotes = availableNotes.filter((note) => note.token === token && !note.spent);

  const sorted = [...validNotes].sort((a, b) => {
    if (a.amount === b.amount) return 0;
    return a.amount < b.amount ? 1 : -1; // descending
  });

  const selectedNotes: ShieldedNote[] = [];
  let totalSelected = 0n;

  for (const note of sorted) {
    if (totalSelected >= requestedAmount) {
      break;
    }
    selectedNotes.push(note);
    totalSelected += note.amount;
  }

  if (totalSelected < requestedAmount) {
    throw new Error(`Insufficient funds. Requested: ${requestedAmount}, Available: ${totalSelected}`);
  }

  const changeAmount = totalSelected - requestedAmount;

  return { selectedNotes, totalSelected, changeAmount };
}
