'use client';

import { useState } from 'react';
import { ArrowUpFromLine, Shield, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ShieldedWithdrawalProps {
  shieldedBalance: bigint;
  onWithdraw: (
    recipientAddress: string,
    amount: bigint
  ) => Promise<{ success: boolean; signature?: string; error?: string }>;
}

type WithdrawalStatus = 'idle' | 'confirming' | 'generating-proof' | 'submitting' | 'success' | 'error';

export function ShieldedWithdrawal({ shieldedBalance, onWithdraw }: ShieldedWithdrawalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [useOwnAddress, setUseOwnAddress] = useState(true);
  const [status, setStatus] = useState<WithdrawalStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(false);

  const formatSOL = (lamports: bigint): string => {
    return (Number(lamports) / 1e9).toFixed(4);
  };

  const parseSOL = (sol: string): bigint => {
    const value = parseFloat(sol);
    if (isNaN(value) || value < 0) return 0n;
    return BigInt(Math.floor(value * 1e9));
  };

  const isValidSolanaAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleWithdraw = async () => {
    const targetAddress = useOwnAddress ? 'SELF' : recipient.trim();

    if (!useOwnAddress) {
      if (!targetAddress) {
        setError('Please enter a recipient address');
        return;
      }

      if (!isValidSolanaAddress(targetAddress)) {
        setError('Invalid Solana address');
        return;
      }
    }

    const amountLamports = parseSOL(amount);
    
    if (amountLamports <= 0n) {
      setError('Please enter a valid amount');
      return;
    }

    // Account for fees (SOL fee + NOC fee)
    const SOL_FEE = 5000n; // ~0.000005 SOL
    const NOC_FEE_EQUIVALENT = 250_000_000n; // 0.25 NOC in lamports equivalent
    
    if (amountLamports + SOL_FEE > shieldedBalance) {
      setError('Insufficient shielded balance (including fees)');
      return;
    }

    setError(null);
    setStatus('confirming');

    try {
      setStatus('generating-proof');
      const result = await onWithdraw(targetAddress, amountLamports);

      if (result.success && result.signature) {
        setSignature(result.signature);
        setStatus('success');
        setRecipient('');
        setAmount('');
      } else {
        setError(result.error || 'Withdrawal failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const handleMaxClick = () => {
    // Leave some for fees
    const feeBuffer = 10_000_000n; // 0.01 SOL buffer
    const maxAmount = shieldedBalance > feeBuffer ? shieldedBalance - feeBuffer : 0n;
    setAmount(formatSOL(maxAmount));
  };

  const resetForm = () => {
    setStatus('idle');
    setError(null);
    setSignature(null);
  };

  const getStatusMessage = (): string => {
    switch (status) {
      case 'confirming':
        return 'Preparing withdrawal...';
      case 'generating-proof':
        return 'Generating zero-knowledge proof...';
      case 'submitting':
        return 'Submitting withdrawal transaction...';
      case 'success':
        return 'Withdrawal complete!';
      case 'error':
        return 'Withdrawal failed';
      default:
        return '';
    }
  };

  return (
    <div className="shielded-withdrawal bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Unshield Funds</h3>
            <p className="text-sm text-gray-500">Withdraw to transparent address</p>
          </div>
        </div>
      </div>

      {status === 'success' ? (
        <div className="success-state bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Withdrawal Complete!</span>
          </div>
          <p className="text-sm text-green-600">
            Your funds have been withdrawn to the transparent address.
          </p>
          {signature && (
            <p className="text-xs text-gray-500 font-mono truncate">
              Tx: {signature}
            </p>
          )}
          <button
            type="button"
            onClick={resetForm}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Make Another Withdrawal
          </button>
        </div>
      ) : (
        <>
          {/* Shielded Balance */}
          <div className="balance-info bg-white/50 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Shielded Balance</span>
              <div className="flex items-center gap-2">
                {showBalance ? (
                  <span className="font-medium">{formatSOL(shieldedBalance)} SOL</span>
                ) : (
                  <span className="font-medium">••••••••</span>
                )}
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Destination Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Withdraw To
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseOwnAddress(true)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                  useOwnAddress
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                My Wallet
              </button>
              <button
                type="button"
                onClick={() => setUseOwnAddress(false)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                  !useOwnAddress
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Other Address
              </button>
            </div>
          </div>

          {/* Recipient Input (if not using own address) */}
          {!useOwnAddress && (
            <div className="space-y-2">
              <label htmlFor="withdrawal-recipient" className="text-sm font-medium text-gray-700">
                Recipient Address
              </label>
              <input
                id="withdrawal-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter Solana address..."
                disabled={status !== 'idle' && status !== 'error'}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 font-mono text-sm"
              />
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="withdrawal-amount" className="text-sm font-medium text-gray-700">
              Amount to Withdraw
            </label>
            <div className="relative">
              <input
                id="withdrawal-amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={status !== 'idle' && status !== 'error'}
                className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMaxClick}
                  disabled={status !== 'idle' && status !== 'error'}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                >
                  MAX
                </button>
                <span className="text-gray-400">SOL</span>
              </div>
            </div>
          </div>

          {/* Privacy Warning */}
          <div className="privacy-warning bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Withdrawing funds will make them visible on-chain. The withdrawn amount will be linked to the destination address.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Message */}
          {status !== 'idle' && status !== 'error' && (
            <div className="status-message flex items-center gap-2 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStatusMessage()}</span>
            </div>
          )}

          {/* Fee Info */}
          <div className="fee-info bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span>~0.000005 SOL</span>
            </div>
            <div className="flex justify-between">
              <span>Privacy Fee</span>
              <span>0.25 NOC</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={status !== 'idle' && status !== 'error'}
            className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <ArrowUpFromLine className="w-4 h-4" />
                Withdraw Funds
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
