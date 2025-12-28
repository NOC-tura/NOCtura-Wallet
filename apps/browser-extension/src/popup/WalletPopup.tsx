/**
 * Wallet Popup Component
 */

import React, { useState, useEffect } from 'react';
import { WalletConnect, TransferForm } from '@noctura/ui-components';

interface WalletState {
  hasWallet: boolean;
  locked: boolean;
  address?: string;
  balance?: number;
}

export const WalletPopup: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    hasWallet: false,
    locked: true,
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'main' | 'create' | 'import'>('main');

  useEffect(() => {
    loadWalletState();
  }, []);

  const loadWalletState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_WALLET_STATE',
      });

      if (response.success) {
        setWalletState(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_WALLET',
        data: {},
      });

      if (response.success) {
        await loadWalletState();
        setView('main');
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };

  const handleTransfer = async (
    recipient: string,
    amount: number,
    memo?: string
  ) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_TRANSACTION',
        data: {
          to: recipient,
          amount,
          memo,
          mode: 'transparent',
        },
      });

      if (response.success) {
        alert(`Transaction sent: ${response.data.signature}`);
        await loadWalletState();
      } else {
        alert(`Transaction failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!walletState.hasWallet) {
    return (
      <div className="popup-container">
        <div className="welcome">
          <h1>Welcome to Noctura Wallet</h1>
          <p>Privacy-first Solana wallet</p>
          
          <div className="actions">
            <button onClick={handleCreateWallet} className="btn btn-primary">
              Create New Wallet
            </button>
            <button onClick={() => setView('import')} className="btn btn-secondary">
              Import Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (walletState.locked) {
    return (
      <div className="popup-container">
        <div className="unlock">
          <h2>Unlock Wallet</h2>
          <input type="password" placeholder="Enter password" />
          <button className="btn btn-primary">Unlock</button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="wallet-header">
        <h1>Noctura Wallet</h1>
        <WalletConnect
          connected={!!walletState.address}
          address={walletState.address}
        />
      </header>

      <main className="wallet-main">
        <div className="balance-section">
          <h2>Balance</h2>
          <div className="balance-amount">
            {walletState.balance || 0} SOL
          </div>
        </div>

        <TransferForm
          onSubmit={handleTransfer}
          balance={walletState.balance || 0}
          token="SOL"
          mode="transparent"
        />
      </main>

      <footer className="wallet-footer">
        <button className="footer-btn">Transparent</button>
        <button className="footer-btn">Shielded</button>
        <button className="footer-btn">Settings</button>
      </footer>
    </div>
  );
};
