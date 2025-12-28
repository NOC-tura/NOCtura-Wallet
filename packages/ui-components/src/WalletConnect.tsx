/**
 * WalletConnect Component
 */

import React, { useState } from 'react';
import { Button } from './Button';

export interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  connected?: boolean;
  address?: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
  connected = false,
  address,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Placeholder: Implement actual wallet connection
      const mockAddress = 'So11111111111111111111111111111111111111112';
      onConnect?.(mockAddress);
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnect?.();
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-connect">
      {!connected ? (
        <Button
          onClick={handleConnect}
          loading={isConnecting}
          variant="primary"
        >
          Connect Wallet
        </Button>
      ) : (
        <div className="wallet-connected">
          <span className="wallet-address">{address ? truncateAddress(address) : ''}</span>
          <Button onClick={handleDisconnect} variant="secondary" size="small">
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
};
