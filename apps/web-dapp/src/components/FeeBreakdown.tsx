interface FeeBreakdownProps {
  nocFee: number;
  solFee: number;
}

export function FeeBreakdown({ nocFee, solFee }: FeeBreakdownProps) {
  return (
    <div className="fee-breakdown border rounded-md p-4 space-y-3 bg-white/40">
      <h3 className="text-lg font-semibold">Transaction Fees</h3>

      <div className="fee-item flex justify-between text-sm">
        <span>NOC Fee:</span>
        <span className="font-mono">${nocFee.toFixed(2)} NOC</span>
      </div>

      <div className="fee-item flex justify-between text-sm">
        <span>SOL Fee:</span>
        <span className="font-mono">{solFee.toFixed(9)} SOL</span>
      </div>

      <div className="fee-total flex justify-between font-semibold">
        <span>Total:</span>
        <span>{nocFee.toFixed(2)} NOC + {solFee.toFixed(9)} SOL</span>
      </div>

      <button type="button" className="info-btn text-blue-600 hover:underline text-sm">
        ℹ️ Why these fees?
      </button>
    </div>
  );
}
