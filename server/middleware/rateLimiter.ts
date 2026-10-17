import { Request, Response, NextFunction } from 'express';

export function createRateLimiter(windowMs: number, maxRequests: number, message = 'Trop de requêtes, veuillez réessayer plus tard.') {
  const hits = new Map<string, { count: number; resetTime: number }>();

  // Nettoyage périodique
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits.entries()) {
      if (now > val.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'client';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetTime) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ success: false, error: message });
    }

    entry.count++;
    return next();
  };
}

export const authRateLimiter = createRateLimiter(60 * 1000, 30);
export const pairingRateLimiter = createRateLimiter(60 * 1000, 15);
