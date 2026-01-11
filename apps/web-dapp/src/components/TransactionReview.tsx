import { AmountDisplay } from './AmountDisplay';
import { FeeBreakdown } from './FeeBreakdown';

interface TransactionReviewProps {
  senderZKHash: string;
  recipientZKHash: string;
  amount: bigint;
  token: string;
  nocFee: number;
  solFee: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TransactionReview(props: TransactionReviewProps) {
  const { senderZKHash, recipientZKHash, amount, token, nocFee, solFee, onConfirm, onCancel } = props;

  return (
    <div className="transaction-review border rounded-lg p-6 bg-white/60 space-y-4">
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Sender</div>
        <div className="font-mono">{senderZKHash}</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-600">Recipient</div>
        <div className="font-mono">{recipientZKHash}</div>
      </div>

      <div className="space-y-1">
        <div className="text-sm text-gray-600">Amount (visible only pre-sign)</div>
        <AmountDisplay amount={amount} token={token} mode="pre_sign" context="shielded" />
      </div>

      <FeeBreakdown nocFee={nocFee} solFee={solFee} />

      <div className="text-xs text-gray-600">
        🔒 Privacy notice: Actual addresses and amounts remain shielded after signing. Reveals require authentication and auto-hide after 30 seconds.
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
          Confirm &amp; Sign
        </button>
      </div>
    </div>
  );
}
