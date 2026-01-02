/**
 * Noctura API Server
 * Main REST API for wallet operations
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { NocturaSDK } from '@noctura/sdk';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize SDK
const sdk = new NocturaSDK({
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com',
  network: 'devnet',
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API info endpoint
app.get('/api/v1/info', (req: Request, res: Response) => {
  res.json({
    name: 'Noctura Wallet API',
    version: '0.1.0',
    network: sdk.getConfig().network,
    endpoints: {
      wallet: '/api/v1/wallet',
      transactions: '/api/v1/transactions',
      tokens: '/api/v1/tokens',
      swap: '/api/v1/swap',
      staking: '/api/v1/staking',
    },
  });
});

// Wallet endpoints
app.get('/api/v1/wallet/:address/balance', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Placeholder: Get actual balance
    const balance = {
      address,
      lamports: 1000000000,
      sol: 1.0,
      tokens: [],
    };

    res.json(balance);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch balance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/v1/wallet/:address/tokens', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Placeholder: Get token balances
    const tokens: any[] = [];

    res.json({
      address,
      tokens,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch tokens',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Transaction endpoints
app.post('/api/v1/transactions/send', async (req: Request, res: Response) => {
  try {
    const { from, to, amount, mode } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: from, to, amount',
      });
    }

    // Placeholder: Send transaction
    const signature = 'TRANSACTION_SIGNATURE';

    res.json({
      success: true,
      signature,
      status: 'pending',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Transaction failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/v1/transactions/:signature', async (req: Request, res: Response) => {
  try {
    const { signature } = req.params;

    // Placeholder: Get transaction details
    const transaction = {
      signature,
      status: 'confirmed',
      blockTime: Date.now(),
      fee: 5000,
    };

    res.json(transaction);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch transaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Token endpoints
app.get('/api/v1/tokens', async (req: Request, res: Response) => {
  try {
    const tokens = await sdk.tokens.getVerifiedTokens();
    
    res.json({
      count: tokens.length,
      tokens,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch tokens',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/v1/tokens/:mint', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const token = await sdk.tokens.getToken(mint);

    if (!token) {
      return res.status(404).json({
        error: 'Token not found',
      });
    }

    res.json(token);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Swap endpoints
app.post('/api/v1/swap/quote', async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, slippage } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: inputMint, outputMint, amount',
      });
    }

    // Placeholder: Get swap quote
    const quote = {
      inputMint,
      outputMint,
      inAmount: amount,
      outAmount: Math.floor(amount * 0.98), // Simplified
      priceImpact: 0.5,
      slippage: slippage || 0.5,
    };

    res.json(quote);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get quote',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Staking endpoints
app.get('/api/v1/staking/validators', async (req: Request, res: Response) => {
  try {
    // Placeholder: Get validator list
    const validators: any[] = [];

    res.json({
      count: validators.length,
      validators,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch validators',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Compliance endpoints
app.post('/api/v1/compliance/audit-token', async (req: Request, res: Response) => {
  try {
    const { address, scope, expiresAt } = req.body;

    // Placeholder: Create audit token
    const auditToken = {
      id: crypto.randomUUID(),
      address,
      scope: scope || ['all'],
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    res.json(auditToken);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create audit token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
async function start() {
  try {
    await sdk.initialize();
    
    app.listen(PORT, () => {
      console.log(`Noctura API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API info: http://localhost:${PORT}/api/v1/info`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
