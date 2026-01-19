/**
 * Metrics routes
 */

import { Router, Request, Response } from 'express';
import { ProverEngine } from '../prover/ProverEngine';
import { ProofQueue } from '../prover/ProofQueue';

export function metricsRouter(proverEngine: ProverEngine, proofQueue: ProofQueue): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const engineStats = proverEngine.stats;
    const queueStats = proofQueue.stats;

    res.json({
      prover: {
        initialized: proverEngine.isInitialized,
        currentLoad: proverEngine.currentLoad,
        maxLoad: proverEngine.maxLoad,
        totalProofsGenerated: engineStats.totalProofs,
        averageProofTimeMs: engineStats.averageProofTime,
      },
      queue: {
        pending: queueStats.queueLength,
        processing: queueStats.processing,
        completed: queueStats.completed,
        maxSize: queueStats.maxQueueSize,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Prometheus-compatible metrics
  router.get('/prometheus', (req: Request, res: Response) => {
    const engineStats = proverEngine.stats;
    const queueStats = proofQueue.stats;

    const metrics = [
      `# HELP noctura_prover_active_proofs Current number of proofs being generated`,
      `# TYPE noctura_prover_active_proofs gauge`,
      `noctura_prover_active_proofs ${proverEngine.currentLoad}`,
      ``,
      `# HELP noctura_prover_total_proofs Total number of proofs generated`,
      `# TYPE noctura_prover_total_proofs counter`,
      `noctura_prover_total_proofs ${engineStats.totalProofs}`,
      ``,
      `# HELP noctura_prover_avg_proof_time_ms Average proof generation time in milliseconds`,
      `# TYPE noctura_prover_avg_proof_time_ms gauge`,
      `noctura_prover_avg_proof_time_ms ${engineStats.averageProofTime}`,
      ``,
      `# HELP noctura_queue_pending Number of proofs waiting in queue`,
      `# TYPE noctura_queue_pending gauge`,
      `noctura_queue_pending ${queueStats.queueLength}`,
      ``,
      `# HELP noctura_queue_processing Number of proofs currently being processed`,
      `# TYPE noctura_queue_processing gauge`,
      `noctura_queue_processing ${queueStats.processing}`,
      ``,
    ].join('\n');

    res.type('text/plain').send(metrics);
  });

  return router;
}
