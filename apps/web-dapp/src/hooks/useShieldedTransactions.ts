import { useState, useCallback, useEffect } from 'react';
import { NocturaSDK, type NocturaSDKConfig } from '@noctura/sdk';

interface ShieldedBalances {
  sol: bigint;
  noc: bigint;
}

/**
 * Prover configuration for the hook
 */
interface ProverConfig {
  type: 'local' | 'remote' | 'noop';
  endpoint?: string;
  timeout?: number;
}

interface UseShieldedTransactionsOptions {
  walletAddress: string | null;
  proverConfig?: ProverConfig;
}

interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

interface UseShieldedTransactionsResult {
  shieldedBalances: ShieldedBalances;
  transparentBalance: bigint;
  isLoading: boolean;
  error: string | null;
  deposit: (amount: bigint, assetMint?: string) => Promise<TransactionResult>;
  transfer: (recipient: string, amount: bigint, memo?: string) => Promise<TransactionResult>;
  withdraw: (recipient: string, amount: bigint) => Promise<TransactionResult>;
  refreshBalances: () => Promise<void>;
}

// Default prover configuration
const DEFAULT_PROVER_CONFIG: ProverConfig = {
  type: 'remote',
  endpoint: process.env.NEXT_PUBLIC_PROVER_URL || 'http://localhost:3001',
};

export function useShieldedTransactions({
  walletAddress,
  proverConfig = DEFAULT_PROVER_CONFIG,
}: UseShieldedTransactionsOptions): UseShieldedTransactionsResult {
  const [sdk, setSdk] = useState<NocturaSDK | null>(null);
  const [shieldedBalances, setShieldedBalances] = useState<ShieldedBalances>({ sol: 0n, noc: 0n });
  const [transparentBalance, setTransparentBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SDK when wallet connects
  useEffect(() => {
    if (!walletAddress) {
      setSdk(null);
      setShieldedBalances({ sol: 0n, noc: 0n });
      setTransparentBalance(0n);
      return;
    }

    const initSdk = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create SDK with prover configuration
        const networkType = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet' | 'testnet';
        const sdkInstance = NocturaSDK.createWithRemoteProver(
          {
            network: networkType,
            rpcEndpoint: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
          },
          proverConfig.type === 'remote' ? proverConfig.endpoint || '' : ''
        );

        await sdkInstance.initialize();
        setSdk(sdkInstance);
        
        // Fetch initial balances via network connection
        await refreshBalancesInternal(sdkInstance, walletAddress);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK');
      } finally {
        setIsLoading(false);
      }
    };

    initSdk();
  }, [walletAddress, proverConfig]);

  const refreshBalancesInternal = async (sdkInstance: NocturaSDK, address: string) => {
    try {
      // Get transparent balance from Solana connection
      const connection = sdkInstance.network.getConnection();
      const { PublicKey } = await import('@solana/web3.js');
      const pubKey = new PublicKey(address);
      const balance = await connection.getBalance(pubKey);
      setTransparentBalance(BigInt(balance));
      
      // Note: Shielded balances would need to be fetched from local note storage
      // For now, we keep the existing state (would be populated from note database)
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const refreshBalances = useCallback(async () => {
    if (!sdk || !walletAddress) return;
    await refreshBalancesInternal(sdk, walletAddress);
  }, [sdk, walletAddress]);

  const deposit = useCallback(async (
    amount: bigint,
    assetMint?: string
  ): Promise<TransactionResult> => {
    if (!sdk || !walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build deposit transaction using shieldedTx builder
      const result = await sdk.shieldedTx.buildDeposit({
        sourceAddress: walletAddress,
        amount,
        assetMint: assetMint || 'SOL',
        feeLevel: 'medium',
      });

      // Refresh balances after successful deposit
      await refreshBalances();

      return { success: true, signature: result.transaction?.toString() };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [sdk, walletAddress, refreshBalances]);

  const transfer = useCallback(async (
    recipient: string,
    amount: bigint,
    memo?: string
  ): Promise<TransactionResult> => {
    if (!sdk || !walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build shielded transfer transaction
      const result = await sdk.shieldedTx.buildShieldedTransfer({
        recipientAddress: recipient,
        amount,
        assetMint: 'SOL',
        feeLevel: 'medium',
        memo,
      });

      // Refresh balances after successful transfer
      await refreshBalances();

      return { success: true, signature: result.transaction?.toString() };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [sdk, walletAddress, refreshBalances]);

  const withdraw = useCallback(async (
    recipient: string,
    amount: bigint
  ): Promise<TransactionResult> => {
    if (!sdk || !walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use 'SELF' marker or the actual recipient address
      const withdrawTo = recipient === 'SELF' ? walletAddress : recipient;
      
      // Build withdrawal transaction
      const result = await sdk.shieldedTx.buildWithdrawal({
        recipientAddress: withdrawTo,
        amount,
        assetMint: 'SOL',
        feeLevel: 'medium',
      });

      // Refresh balances after successful withdrawal
      await refreshBalances();

      return { success: true, signature: result.transaction?.toString() };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [sdk, walletAddress, refreshBalances]);

  return {
    shieldedBalances,
    transparentBalance,
    isLoading,
    error,
    deposit,
    transfer,
    withdraw,
    refreshBalances,
  };
}
