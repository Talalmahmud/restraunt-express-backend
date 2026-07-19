import 'reflect-metadata';
import type { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestError } from './errors/http-errors';

type ClassConstructor<T> = new (...args: unknown[]) => T;

async function transformAndValidate<T extends object>(
  dtoClass: ClassConstructor<T>,
  plain: unknown,
): Promise<T> {
  const instance = plainToInstance(dtoClass, plain ?? {});
  const errors = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const message = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');
    throw new BadRequestError(message || 'Validation failed');
  }

  return instance;
}

export function validateBody<T extends object>(dtoClass: ClassConstructor<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    transformAndValidate(dtoClass, req.body)
      .then((instance) => {
        req.body = instance;
        next();
      })
      .catch(next);
  };
}

export function validateQuery<T extends object>(dtoClass: ClassConstructor<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    transformAndValidate(dtoClass, req.query)
      .then((instance) => {
        // req.query is a getter-only accessor in Express 5; redefine it to inject
        // the validated/transformed instance instead of assigning (which throws).
        Object.defineProperty(req, 'query', {
          value: instance,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        next();
      })
      .catch(next);
  };
}
