/**
 * Popup Entry Point for Noctura Wallet Extension
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { WalletPopup } from './WalletPopup';
import './popup.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <WalletPopup />
    </React.StrictMode>
  );
}
