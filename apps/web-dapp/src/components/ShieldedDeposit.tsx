'use client';

import { useState } from 'react';
import { Shield, ArrowDownToLine, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ShieldedDepositProps {
  walletAddress: string;
  transparentBalance: bigint;
  onDeposit: (amount: bigint, assetMint?: string) => Promise<{ success: boolean; signature?: string; error?: string }>;
}

type DepositStatus = 'idle' | 'confirming' | 'generating-proof' | 'submitting' | 'success' | 'error';

export function ShieldedDeposit({ walletAddress, transparentBalance, onDeposit }: ShieldedDepositProps) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const formatSOL = (lamports: bigint): string => {
    return (Number(lamports) / 1e9).toFixed(4);
  };

  const parseSOL = (sol: string): bigint => {
    const value = parseFloat(sol);
    if (isNaN(value) || value < 0) return 0n;
    return BigInt(Math.floor(value * 1e9));
  };

  const handleDeposit = async () => {
    const amountLamports = parseSOL(amount);
    
    if (amountLamports <= 0n) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountLamports > transparentBalance) {
      setError('Insufficient transparent balance');
      return;
    }

    setError(null);
    setStatus('confirming');

    try {
      setStatus('generating-proof');
      const result = await onDeposit(amountLamports);

      if (result.success && result.signature) {
        setSignature(result.signature);
        setStatus('success');
        setAmount('');
      } else {
        setError(result.error || 'Deposit failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const handleMaxClick = () => {
    // Leave some for fees
    const maxAmount = transparentBalance > 10000000n ? transparentBalance - 10000000n : 0n;
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
        return 'Confirming transaction...';
      case 'generating-proof':
        return 'Generating zero-knowledge proof...';
      case 'submitting':
        return 'Submitting transaction...';
      case 'success':
        return 'Deposit successful!';
      case 'error':
        return 'Deposit failed';
      default:
        return '';
    }
  };

  return (
    <div className="shielded-deposit bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Shield className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Shield Funds</h3>
          <p className="text-sm text-gray-500">Move SOL to your shielded vault</p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="success-state bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Deposit Complete!</span>
          </div>
          <p className="text-sm text-green-600">
            Your funds are now shielded and private.
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
            Make Another Deposit
          </button>
        </div>
      ) : (
        <>
          <div className="balance-info bg-white/50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Available Balance</span>
              <span className="font-medium">{formatSOL(transparentBalance)} SOL</span>
            </div>
          </div>

          <div className="amount-input space-y-2">
            <label htmlFor="deposit-amount" className="text-sm font-medium text-gray-700">
              Amount to Shield
            </label>
            <div className="relative">
              <input
                id="deposit-amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={status !== 'idle' && status !== 'error'}
                className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMaxClick}
                  disabled={status !== 'idle' && status !== 'error'}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                >
                  MAX
                </button>
                <span className="text-gray-400">SOL</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {status !== 'idle' && status !== 'error' && (
            <div className="status-message flex items-center gap-2 text-purple-600 text-sm bg-purple-50 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStatusMessage()}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleDeposit}
            disabled={status !== 'idle' && status !== 'error'}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                Shield Funds
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Shielded funds are private and cannot be traced on-chain.
          </p>
        </>
      )}
    </div>
  );
}
