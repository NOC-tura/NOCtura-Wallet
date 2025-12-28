/**
 * TransferForm Component
 */

import React, { useState } from 'react';
import { Button } from './Button';

export interface TransferFormProps {
  onSubmit?: (recipient: string, amount: number, memo?: string) => Promise<void>;
  balance?: number;
  token?: string;
  mode?: 'transparent' | 'shielded';
}

export const TransferForm: React.FC<TransferFormProps> = ({
  onSubmit,
  balance = 0,
  token = 'SOL',
  mode = 'transparent',
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!recipient) {
      setError('Recipient address is required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(recipient, amountNum, memo || undefined);
      
      // Reset form on success
      setRecipient('');
      setAmount('');
      setMemo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };

  return (
    <form onSubmit={handleSubmit} className="transfer-form">
      <div className="form-header">
        <h3>{mode === 'shielded' ? 'Shielded' : 'Transparent'} Transfer</h3>
        <span className="balance">Balance: {balance} {token}</span>
      </div>

      <div className="form-group">
        <label htmlFor="recipient">Recipient Address</label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Enter Solana address"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="amount">
          Amount ({token})
          <button
            type="button"
            onClick={setMaxAmount}
            className="max-button"
            disabled={isSubmitting}
          >
            MAX
          </button>
        </label>
        <input
          id="amount"
          type="number"
          step="0.000000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
          required
        />
      </div>

      {mode === 'transparent' && (
        <div className="form-group">
          <label htmlFor="memo">Memo (Optional)</label>
          <input
            id="memo"
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Add a note"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <Button
        type="submit"
        fullWidth
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send'}
      </Button>

      {mode === 'shielded' && (
        <div className="privacy-notice">
          🔒 This transaction will be private and details will be hidden
        </div>
      )}
    </form>
  );
};
