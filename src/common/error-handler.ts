import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errors/http-errors';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ statusCode: 404, message: 'Route not found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ statusCode: err.statusCode, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ statusCode: 500, message: 'Internal server error' });
}
