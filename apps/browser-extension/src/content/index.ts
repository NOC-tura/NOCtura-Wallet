/**
 * Content Script for Noctura Wallet Extension
 * Injects wallet provider into web pages
 */

// Inject provider script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from injected script
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  const message = event.data;
  
  // Only handle Noctura messages
  if (!message.type || !message.type.startsWith('NOCTURA_')) return;

  try {
    // Forward to background script
    const response = await chrome.runtime.sendMessage({
      type: message.type.replace('NOCTURA_', ''),
      data: message.data,
    });

    // Send response back to page
    window.postMessage(
      {
        type: `${message.type}_RESPONSE`,
        id: message.id,
        data: response,
      },
      '*'
    );
  } catch (error) {
    window.postMessage(
      {
        type: `${message.type}_RESPONSE`,
        id: message.id,
        error: error.message,
      },
      '*'
    );
  }
});

console.log('Noctura Wallet content script loaded');
