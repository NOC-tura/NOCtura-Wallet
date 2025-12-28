/**
 * Background Service Worker for Noctura Wallet Extension
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Noctura Wallet installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html'),
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'GET_WALLET_STATE':
      handleGetWalletState(sendResponse);
      return true; // Keep channel open for async response

    case 'CREATE_WALLET':
      handleCreateWallet(message.data, sendResponse);
      return true;

    case 'IMPORT_WALLET':
      handleImportWallet(message.data, sendResponse);
      return true;

    case 'SEND_TRANSACTION':
      handleSendTransaction(message.data, sendResponse);
      return true;

    case 'GET_BALANCE':
      handleGetBalance(message.data, sendResponse);
      return true;

    case 'CONNECT_DAPP':
      handleConnectDapp(message.data, sender, sendResponse);
      return true;

    case 'SIGN_MESSAGE':
      handleSignMessage(message.data, sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Handle wallet state
async function handleGetWalletState(sendResponse) {
  try {
    const state = await chrome.storage.local.get(['wallet', 'locked']);
    sendResponse({
      success: true,
      data: {
        hasWallet: !!state.wallet,
        locked: state.locked !== false,
      },
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle wallet creation
async function handleCreateWallet(data, sendResponse) {
  try {
    // Placeholder: Implement actual wallet creation
    // 1. Generate mnemonic
    // 2. Derive keypair
    // 3. Encrypt and store
    
    const wallet = {
      address: 'GENERATED_ADDRESS',
      createdAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({
      wallet,
      locked: false,
    });

    sendResponse({
      success: true,
      data: wallet,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle wallet import
async function handleImportWallet(data, sendResponse) {
  try {
    const { seedPhrase, password } = data;

    // Placeholder: Implement wallet import
    // 1. Validate seed phrase
    // 2. Derive keypair
    // 3. Encrypt with password
    // 4. Store securely

    const wallet = {
      address: 'IMPORTED_ADDRESS',
      importedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({
      wallet,
      locked: false,
    });

    sendResponse({
      success: true,
      data: wallet,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle transaction sending
async function handleSendTransaction(data, sendResponse) {
  try {
    const { to, amount, mode } = data;

    // Placeholder: Implement transaction sending
    // 1. Build transaction
    // 2. Sign with wallet
    // 3. Submit to network
    // 4. Wait for confirmation

    const txSignature = 'TX_SIGNATURE_PLACEHOLDER';

    sendResponse({
      success: true,
      data: {
        signature: txSignature,
        status: 'confirmed',
      },
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle balance retrieval
async function handleGetBalance(data, sendResponse) {
  try {
    const { address } = data;

    // Placeholder: Fetch balance from RPC
    const balance = {
      sol: 1.5,
      tokens: [],
    };

    sendResponse({
      success: true,
      data: balance,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle DApp connection request
async function handleConnectDapp(data, sender, sendResponse) {
  try {
    const { origin } = data;

    // Show connection approval popup
    const approval = await showConnectionApproval(origin);

    if (approval) {
      // Store approved connection
      const connections = await chrome.storage.local.get('connections') || {};
      connections[origin] = {
        approved: true,
        approvedAt: new Date().toISOString(),
      };

      await chrome.storage.local.set({ connections });

      sendResponse({
        success: true,
        data: {
          publicKey: 'WALLET_PUBLIC_KEY',
        },
      });
    } else {
      sendResponse({
        success: false,
        error: 'Connection rejected by user',
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Handle message signing
async function handleSignMessage(data, sendResponse) {
  try {
    const { message } = data;

    // Placeholder: Sign message with wallet
    const signature = 'MESSAGE_SIGNATURE';

    sendResponse({
      success: true,
      data: { signature },
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// Show connection approval popup
async function showConnectionApproval(origin) {
  // Placeholder: Show approval UI
  return true;
}

// Auto-lock wallet after timeout
let lockTimeout;
function resetLockTimeout() {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
  }

  lockTimeout = setTimeout(async () => {
    await chrome.storage.local.set({ locked: true });
    console.log('Wallet auto-locked');
  }, 5 * 60 * 1000); // 5 minutes
}

// Listen for user activity
chrome.runtime.onMessage.addListener(() => {
  resetLockTimeout();
});

console.log('Noctura Wallet background service worker loaded');
