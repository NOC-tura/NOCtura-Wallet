/**
 * Noctura Prover Service
 * 
 * HTTP API for generating zero-knowledge proofs for shielded transactions.
 * Runs as a standalone service to offload heavy proof computation from clients.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ProverEngine } from './prover/ProverEngine';
import { ProofQueue } from './prover/ProofQueue';
import { healthRouter } from './routes/health';
import { proveRouter } from './routes/prove';
import { metricsRouter } from './routes/metrics';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { getConfig } from './config';

const config = getConfig();

// Initialize prover engine
const proverEngine = new ProverEngine({
  maxConcurrentProofs: config.maxConcurrentProofs,
  proofTimeout: config.proofTimeout,
});

// Initialize proof queue
const proofQueue = new ProofQueue(proverEngine, {
  maxQueueSize: config.maxQueueSize,
});

// Create Express app
const app: Application = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(rateLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/prove', proveRouter(proofQueue));
app.use('/metrics', metricsRouter(proverEngine, proofQueue));

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port;

async function start() {
  try {
    // Initialize prover engine (load circuits, keys)
    await proverEngine.initialize();
    console.log('✓ Prover engine initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Noctura Prover Service running on port ${PORT}`);
      console.log(`   Environment: ${config.environment}`);
      console.log(`   Max concurrent proofs: ${config.maxConcurrentProofs}`);
    });
  } catch (error) {
    console.error('Failed to start prover service:', error);
    process.exit(1);
  }
}

start();

export { app, proverEngine, proofQueue };
