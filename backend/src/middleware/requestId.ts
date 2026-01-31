import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = nanoid(10);
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
