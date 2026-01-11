import { useEffect, useState } from 'react';
import { formatAmount } from '../utils/format';

interface AmountDisplayProps {
  amount: bigint;
  token: string;
  mode: 'pre_sign' | 'post_sign' | 'history' | 'pending';
  context: 'shielded' | 'transparent';
  onReveal?: () => void;
}

const BULLETS = '••••••••••••';

export function AmountDisplay({ amount, token, mode, context, onReveal }: AmountDisplayProps) {
  const [revealed, setRevealed] = useState(mode === 'pre_sign');

  useEffect(() => {
    if (!revealed || mode === 'pre_sign') return;
    const timer = setTimeout(() => setRevealed(false), 30_000);
    return () => clearTimeout(timer);
  }, [revealed, mode]);

  if (context === 'transparent') {
    return <span>{formatAmount(amount)} {token}</span>;
  }

  if (mode === 'pre_sign') {
    return (
      <div>
        <div className="text-lg font-bold">{formatAmount(amount)} {token}</div>
        <div className="text-amber-600 text-sm">⚠️ Amount will be hidden after signing</div>
      </div>
    );
  }

  if (revealed) {
    return <span>{formatAmount(amount)} {token}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span>{BULLETS} {token}</span>
      {onReveal && (
        <button onClick={() => { onReveal(); setRevealed(true); }} className="reveal-btn text-blue-600 hover:underline">
          🔓 Reveal Amount
        </button>
      )}
    </div>
  );
}
