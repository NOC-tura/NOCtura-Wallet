/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';

const healthRouter = Router();

export { healthRouter };

healthRouter.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  // Add more readiness checks as needed
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/live', (req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
  });
});
