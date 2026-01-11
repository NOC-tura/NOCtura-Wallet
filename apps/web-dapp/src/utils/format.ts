const LAMPORTS_PER_SOL = 1_000_000_000n;

export function formatAmount(amount: bigint, decimals: number = 9, maximumFractionDigits = 6): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const value = Number(amount) / Number(divisor);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatSOL(lamports: bigint | number, maximumFractionDigits = 6): string {
  const value = typeof lamports === 'bigint' ? lamports : BigInt(Math.floor(lamports));
  const sol = Number(value) / Number(LAMPORTS_PER_SOL);
  return sol.toFixed(maximumFractionDigits);
}

export function formatNOC(nanoNoc: bigint | number, maximumFractionDigits = 6): string {
  const value = typeof nanoNoc === 'bigint' ? nanoNoc : BigInt(Math.floor(nanoNoc));
  const noc = Number(value) / 1_000_000_000;
  return noc.toFixed(maximumFractionDigits);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
