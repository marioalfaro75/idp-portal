import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { UnauthorizedError } from '../utils/errors';
import type { JwtPayload } from '@idp/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Check session is still valid (server-side revocation)
    const session = await prisma.session.findUnique({ where: { jti: payload.jti } });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else {
      next(new UnauthorizedError('Invalid token'));
    }
  }
}
