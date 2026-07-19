import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/http-errors';
import type { JwtPayload } from '../../types/jwt-payload.interface';
import type { AuthUser } from '../../types/auth-user.interface';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}

function verifyToken(token: string, secret: string): AuthUser {
  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    return { id: payload.sub, role: payload.role, type: payload.type };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/** Verifies the access token and attaches the authenticated principal to req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) throw new UnauthorizedError('Missing bearer token');
  req.user = verifyToken(token, env.jwt.secret);
  next();
}

/** Verifies the refresh token (separate secret) and attaches req.user. Used only by /auth/refresh. */
export function authenticateRefresh(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) throw new UnauthorizedError('Missing bearer token');
  req.user = verifyToken(token, env.jwt.refreshSecret);
  next();
}
