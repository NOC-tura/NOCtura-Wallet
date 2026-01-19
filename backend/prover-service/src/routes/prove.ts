/**
 * Proof generation routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ProofQueue } from '../prover/ProofQueue';

export function proveRouter(proofQueue: ProofQueue): Router {
  const router = Router();

  /**
   * Generate a shielded transfer proof
   */
  router.post('/transfer', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipientAddress, amount, assetMint, senderSecretKey, inputNotes, async: isAsync } = req.body;

      if (!recipientAddress || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: recipientAddress, amount',
        });
      }

      const proofId = await proofQueue.enqueue('transfer', {
        recipientAddress,
        amount,
        assetMint,
        senderSecretKey,
        inputNotes,
      });

      if (isAsync) {
        return res.json({
          proofId,
          status: 'queued',
          message: 'Proof generation queued. Poll /prove/status/:id for result.',
        });
      }

      // Wait for proof synchronously
      const result = await proofQueue.waitForProof(proofId);

      if (result.status === 'failed') {
        return res.status(500).json({
          error: result.error,
          proofId,
        });
      }

      res.json({
        proofId,
        proof: result.result?.proof,
        publicSignals: result.result?.publicSignals,
        proofTime: result.result?.proofTime,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Generate a deposit proof
   */
  router.post('/deposit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sourceAddress, amount, assetMint, recipientPublicKey, async: isAsync } = req.body;

      if (!sourceAddress || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: sourceAddress, amount',
        });
      }

      const proofId = await proofQueue.enqueue('deposit', {
        sourceAddress,
        amount,
        assetMint,
        recipientPublicKey,
      });

      if (isAsync) {
        return res.json({
          proofId,
          status: 'queued',
          message: 'Proof generation queued. Poll /prove/status/:id for result.',
        });
      }

      const result = await proofQueue.waitForProof(proofId);

      if (result.status === 'failed') {
        return res.status(500).json({
          error: result.error,
          proofId,
        });
      }

      res.json({
        proofId,
        proof: result.result?.proof,
        publicSignals: result.result?.publicSignals,
        proofTime: result.result?.proofTime,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Generate a withdrawal proof
   */
  router.post('/withdrawal', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipientAddress, amount, assetMint, inputNote, secretKey, async: isAsync } = req.body;

      if (!recipientAddress || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: recipientAddress, amount',
        });
      }

      const proofId = await proofQueue.enqueue('withdrawal', {
        recipientAddress,
        amount,
        assetMint,
        inputNote,
        secretKey,
      });

      if (isAsync) {
        return res.json({
          proofId,
          status: 'queued',
          message: 'Proof generation queued. Poll /prove/status/:id for result.',
        });
      }

      const result = await proofQueue.waitForProof(proofId);

      if (result.status === 'failed') {
        return res.status(500).json({
          error: result.error,
          proofId,
        });
      }

      res.json({
        proofId,
        proof: result.result?.proof,
        publicSignals: result.result?.publicSignals,
        proofTime: result.result?.proofTime,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Check proof status
   */
  router.get('/status/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const proof = proofQueue.getProof(id);

    if (!proof) {
      return res.status(404).json({
        error: 'Proof not found',
        proofId: id,
      });
    }

    const response: Record<string, unknown> = {
      proofId: proof.id,
      status: proof.status,
      createdAt: proof.createdAt,
    };

    if (proof.status === 'completed' && proof.result) {
      response.proof = proof.result.proof;
      response.publicSignals = proof.result.publicSignals;
      response.proofTime = proof.result.proofTime;
    } else if (proof.status === 'failed') {
      response.error = proof.error;
    }

    res.json(response);
  });

  return router;
}
