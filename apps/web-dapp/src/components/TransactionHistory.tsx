import { useState } from 'react';
import { AmountDisplay } from './AmountDisplay';
import { requestAuthentication, logRevealEvent } from '../utils/auth';
import { formatTimestamp } from '../utils/format';

export interface HistoryTransaction {
  id: string;
  senderZKHash: string;
  recipientZKHash: string;
  amount: bigint;
  token: string;
  nocFee: number;
  solFee: number;
  timestamp?: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

interface TransactionHistoryProps {
  transactions: HistoryTransaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [revealedTx, setRevealedTx] = useState<string | null>(null);

  const handleRevealAmount = async (txId: string) => {
    const authenticated = await requestAuthentication('Authenticate to reveal this amount for 30 seconds');
    if (!authenticated) return;
    logRevealEvent(`tx:${txId}`);
    setRevealedTx(txId);
    setTimeout(() => setRevealedTx((current) => (current === txId ? null : current)), 30_000);
  };

  return (
    <div className="transaction-history space-y-3">
      {transactions.map((tx) => (
        <TransactionCard
          key={tx.id}
          senderZKHash={tx.senderZKHash}
          recipientZKHash={tx.recipientZKHash}
          amount={revealedTx === tx.id ? tx.amount : 0n}
          hidden={!revealedTx || revealedTx !== tx.id}
          token={tx.token}
          nocFee={tx.nocFee}
          solFee={tx.solFee}
          onReveal={() => handleRevealAmount(tx.id)}
          timestamp={tx.timestamp}
          status={tx.status}
        />
      ))}
    </div>
  );
}

interface TransactionCardProps {
  senderZKHash: string;
  recipientZKHash: string;
  amount: bigint;
  hidden: boolean;
  token: string;
  nocFee: number;
  solFee: number;
  timestamp?: number;
  status?: 'pending' | 'confirmed' | 'failed';
  onReveal: () => void;
}

function TransactionCard({ senderZKHash, recipientZKHash, amount, hidden, token, nocFee, solFee, timestamp, status, onReveal }: TransactionCardProps) {
  const mode: 'pre_sign' | 'history' = hidden ? 'history' : 'pre_sign';

  return (
    <div className="border rounded-md p-4 bg-white/50 space-y-2">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{timestamp ? formatTimestamp(timestamp) : '—'}</span>
        <span className="capitalize">{status ?? 'pending'}</span>
      </div>

      <div className="text-sm font-mono">From: {senderZKHash}</div>
      <div className="text-sm font-mono">To: {recipientZKHash}</div>

      <div className="flex items-center justify-between">
        <AmountDisplay amount={hidden ? 0n : amount} token={token} mode={mode} context="shielded" onReveal={onReveal} />
        {hidden && (
          <button type="button" onClick={onReveal} className="text-blue-600 hover:underline text-sm">
            🔓 Reveal Amount
          </button>
        )}
      </div>

      <div className="flex gap-3 text-xs text-gray-700">
        <span>Fees: {nocFee.toFixed(2)} NOC</span>
        <span>+ {solFee.toFixed(9)} SOL</span>
      </div>
    </div>
  );
}
