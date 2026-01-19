/**
 * Rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.rateLimitWindowMs,
    };
  }

  entry.count++;
  rateLimitMap.set(clientIp, entry);

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', config.rateLimitMaxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.rateLimitMaxRequests - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  if (entry.count > config.rateLimitMaxRequests) {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      },
    });
    return;
  }

  next();
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);
