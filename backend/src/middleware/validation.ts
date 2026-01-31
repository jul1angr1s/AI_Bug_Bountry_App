import type { Request, Response, NextFunction } from 'express';
import { ZodError, type AnyZodObject, type ZodType } from 'zod';
import { ValidationError } from '../errors/CustomError.js';

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten();
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  };
}
