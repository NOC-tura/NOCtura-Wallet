/**
 * Prover Service Configuration
 */

export interface ProverServiceConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  corsOrigins: string[];
  maxConcurrentProofs: number;
  maxQueueSize: number;
  proofTimeout: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export function getConfig(): ProverServiceConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    environment: (process.env.NODE_ENV as ProverServiceConfig['environment']) || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    maxConcurrentProofs: parseInt(process.env.MAX_CONCURRENT_PROOFS || '4', 10),
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '100', 10),
    proofTimeout: parseInt(process.env.PROOF_TIMEOUT || '60000', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  };
}
