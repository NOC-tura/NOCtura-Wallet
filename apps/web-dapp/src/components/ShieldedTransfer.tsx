'use client';

import { useState } from 'react';
import { Send, Shield, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ShieldedTransferProps {
  shieldedBalance: bigint;
  onTransfer: (
    recipientAddress: string,
    amount: bigint,
    memo?: string
  ) => Promise<{ success: boolean; signature?: string; error?: string }>;
}

type TransferStatus = 'idle' | 'confirming' | 'generating-proof' | 'submitting' | 'success' | 'error';

export function ShieldedTransfer({ shieldedBalance, onTransfer }: ShieldedTransferProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [status, setStatus] = useState<TransferStatus>('idle');
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
    // Basic validation - should be 32-44 characters base58
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleTransfer = async () => {
    // Validation
    if (!recipient.trim()) {
      setError('Please enter a recipient address');
      return;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError('Invalid Solana address');
      return;
    }

    const amountLamports = parseSOL(amount);
    
    if (amountLamports <= 0n) {
      setError('Please enter a valid amount');
      return;
    }

    // Account for fees
    const ESTIMATED_FEE = 250_000_000n; // 0.25 NOC equivalent in SOL
    if (amountLamports + ESTIMATED_FEE > shieldedBalance) {
      setError('Insufficient shielded balance (including fees)');
      return;
    }

    setError(null);
    setStatus('confirming');

    try {
      setStatus('generating-proof');
      const result = await onTransfer(recipient, amountLamports, memo || undefined);

      if (result.success && result.signature) {
        setSignature(result.signature);
        setStatus('success');
        setRecipient('');
        setAmount('');
        setMemo('');
      } else {
        setError(result.error || 'Transfer failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setError(null);
    setSignature(null);
  };

  const getStatusMessage = (): string => {
    switch (status) {
      case 'confirming':
        return 'Preparing transaction...';
      case 'generating-proof':
        return 'Generating zero-knowledge proof (this may take a moment)...';
      case 'submitting':
        return 'Submitting shielded transaction...';
      case 'success':
        return 'Transfer complete!';
      case 'error':
        return 'Transfer failed';
      default:
        return '';
    }
  };

  return (
    <div className="shielded-transfer bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Private Transfer</h3>
            <p className="text-sm text-gray-500">Send shielded SOL privately</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600 font-medium">Private</span>
        </div>
      </div>

      {status === 'success' ? (
        <div className="success-state bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Transfer Complete!</span>
          </div>
          <p className="text-sm text-green-600">
            Your private transfer has been sent. The recipient will see the funds shortly.
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
            Make Another Transfer
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

          {/* Recipient Input */}
          <div className="space-y-2">
            <label htmlFor="recipient-address" className="text-sm font-medium text-gray-700">
              Recipient Address
            </label>
            <input
              id="recipient-address"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address..."
              disabled={status !== 'idle' && status !== 'error'}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 font-mono text-sm"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="transfer-amount" className="text-sm font-medium text-gray-700">
              Amount
            </label>
            <div className="relative">
              <input
                id="transfer-amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={status !== 'idle' && status !== 'error'}
                className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                SOL
              </span>
            </div>
          </div>

          {/* Optional Memo */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMemo(!showMemo)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showMemo ? '- Hide memo' : '+ Add memo (optional)'}
            </button>
            {showMemo && (
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Add a private note..."
                maxLength={100}
                disabled={status !== 'idle' && status !== 'error'}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-sm"
              />
            )}
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
            <div className="status-message flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
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
            onClick={handleTransfer}
            disabled={status !== 'idle' && status !== 'error'}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <Send className="w-4 h-4" />
                Send Private Transfer
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Private transfers cannot be traced or linked to your identity.
          </p>
        </>
      )}
    </div>
  );
}
