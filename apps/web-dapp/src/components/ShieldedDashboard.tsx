'use client';

import { useState } from 'react';
import { Shield, ArrowDownToLine, Send, ArrowUpFromLine, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ShieldedDeposit } from './ShieldedDeposit';
import { ShieldedTransfer } from './ShieldedTransfer';
import { ShieldedWithdrawal } from './ShieldedWithdrawal';
import { useShieldedTransactions } from '../hooks/useShieldedTransactions';

interface ShieldedDashboardProps {
  walletAddress: string | null;
  isWalletConnected: boolean;
}

type ActiveTab = 'deposit' | 'transfer' | 'withdraw';

export function ShieldedDashboard({ walletAddress, isWalletConnected }: ShieldedDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('deposit');
  const [showBalances, setShowBalances] = useState(false);

  const {
    shieldedBalances,
    transparentBalance,
    isLoading,
    error,
    deposit,
    transfer,
    withdraw,
    refreshBalances,
  } = useShieldedTransactions({
    walletAddress,
  });

  const formatSOL = (lamports: bigint): string => {
    return (Number(lamports) / 1e9).toFixed(4);
  };

  const formatNOC = (amount: bigint): string => {
    return (Number(amount) / 1e9).toFixed(4);
  };

  if (!isWalletConnected || !walletAddress) {
    return (
      <div className="shielded-dashboard-disconnected bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-purple-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-500">
          Connect your Solana wallet to access shielded transactions and private transfers.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'deposit' as const, label: 'Shield', icon: ArrowDownToLine, color: 'purple' },
    { id: 'transfer' as const, label: 'Transfer', icon: Send, color: 'blue' },
    { id: 'withdraw' as const, label: 'Unshield', icon: ArrowUpFromLine, color: 'orange' },
  ];

  return (
    <div className="shielded-dashboard space-y-6">
      {/* Header */}
      <div className="dashboard-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Shielded Vault</h2>
            <p className="text-sm text-gray-500">Private transactions powered by ZK proofs</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshBalances}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance Cards */}
      <div className="balance-cards grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Transparent Balance */}
        <div className="balance-card bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm text-gray-500">Transparent Balance</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatSOL(transparentBalance)} <span className="text-base font-normal text-gray-400">SOL</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Visible on-chain</p>
        </div>

        {/* Shielded SOL Balance */}
        <div className="balance-card bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-purple-600">Shielded SOL</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBalances(!showBalances)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {showBalances ? formatSOL(shieldedBalances.sol) : '••••••••'}{' '}
            <span className="text-base font-normal text-gray-400">SOL</span>
          </div>
          <p className="text-xs text-green-600 mt-1">🔒 Private</p>
        </div>

        {/* Shielded NOC Balance */}
        <div className="balance-card bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">Shielded NOC</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {showBalances ? formatNOC(shieldedBalances.noc) : '••••••••'}{' '}
            <span className="text-base font-normal text-gray-400">NOC</span>
          </div>
          <p className="text-xs text-green-600 mt-1">🔒 Private (for fees)</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation flex gap-2 p-1 bg-gray-100 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all ${
                isActive
                  ? `bg-white shadow-sm text-${tab.color}-600`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'deposit' && (
          <ShieldedDeposit
            walletAddress={walletAddress}
            transparentBalance={transparentBalance}
            onDeposit={deposit}
          />
        )}
        {activeTab === 'transfer' && (
          <ShieldedTransfer
            shieldedBalance={shieldedBalances.sol}
            onTransfer={transfer}
          />
        )}
        {activeTab === 'withdraw' && (
          <ShieldedWithdrawal
            shieldedBalance={shieldedBalances.sol}
            onWithdraw={withdraw}
          />
        )}
      </div>

      {/* Info Footer */}
      <div className="info-footer bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-2">
        <p>
          <strong>How it works:</strong> Shielded transactions use zero-knowledge proofs to hide 
          transaction amounts and recipients while still being verified on the Solana blockchain.
        </p>
        <p>
          <strong>Fees:</strong> Each shielded transaction requires 0.25 NOC as a privacy fee, 
          plus standard Solana network fees (~0.000005 SOL).
        </p>
      </div>
    </div>
  );
}
