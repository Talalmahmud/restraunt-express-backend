import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors/http-errors';

/** Must run after `authenticate`. Restricts the route to the given roles. */
export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}
