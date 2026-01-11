import { useState } from 'react';
import type { NoteDatabase } from '../types/note';
import { formatNOC, formatSOL } from '../utils/format';
import { requestAuthentication } from '../utils/auth';

interface ShieldedBalanceProps {
  owner: string;
  noteDatabase: NoteDatabase;
}

export function ShieldedBalance({ owner, noteDatabase }: ShieldedBalanceProps) {
  const [revealed, setRevealed] = useState(false);

  const solBalance = noteDatabase.getTotalBalance(owner, 'SOL');
  const nocBalance = noteDatabase.getTotalBalance(owner, 'NOC');

  const handleReveal = async () => {
    const authenticated = await requestAuthentication('Authenticate to reveal shielded balances');
    if (authenticated) {
      setRevealed(true);
      setTimeout(() => setRevealed(false), 30_000);
    }
  };

  return (
    <div className="shielded-vault border rounded-lg p-4 bg-white/50 space-y-4">
      <h2 className="text-lg font-semibold">💼 SHIELDED VAULT</h2>

      <div className="balance-item flex justify-between items-center">
        <span>SOL Balance</span>
        {revealed ? (
          <span>{formatSOL(solBalance)} SOL</span>
        ) : (
          <div className="flex items-center gap-2">
            <span>•••••••••••• SOL</span>
            <button type="button" onClick={handleReveal} className="text-blue-600 hover:underline text-sm">👁️ Reveal Balance</button>
          </div>
        )}
      </div>

      <div className="balance-item flex justify-between items-center">
        <span>NOC Balance</span>
        {revealed ? (
          <span>{formatNOC(nocBalance)} NOC</span>
        ) : (
          <div className="flex items-center gap-2">
            <span>•••••••••••• NOC</span>
            <button type="button" onClick={handleReveal} className="text-blue-600 hover:underline text-sm">👁️ Reveal Balance</button>
          </div>
        )}
      </div>

      <div className="privacy-status text-green-700 text-sm">✓ Fully Shielded</div>
    </div>
  );
}
