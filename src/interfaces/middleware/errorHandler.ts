import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors/AppError';
import { logger } from '../../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(err.message, { name: err.name, statusCode: err.statusCode });
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Unexpected error — log full stack for debugging
  logger.error('Unhandled error', { name: err.name, message: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
}
