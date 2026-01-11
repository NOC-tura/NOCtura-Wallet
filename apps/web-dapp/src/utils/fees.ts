export function calculateNOCFee(
  transactionType: 'transfer' | 'deposit' | 'withdraw',
  numberOfNotes: number,
  priorityLane: boolean = false
): number {
  let fee = 0.05; // Base fee in NOC

  if (numberOfNotes > 5) {
    fee += 0.02;
  }
  if (numberOfNotes > 10) {
    fee += 0.03; // Total +0.05 from base
  }

  if (priorityLane) {
    fee += 0.15;
  }

  return Number(fee.toFixed(2));
}

export const SOL_FEE_LAMPORTS = 50_000;
export const SOL_FEE = 0.000005;

export function validateMinimumNOC(shieldedNOCBalance: number): boolean {
  const MIN_NOC_REQUIRED = 0.25;
  return shieldedNOCBalance >= MIN_NOC_REQUIRED;
}
