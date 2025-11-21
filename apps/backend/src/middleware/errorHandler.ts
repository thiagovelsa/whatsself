import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger.js';
import { randomUUID } from 'node:crypto';

const logger = createLogger('error-handler');

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCandidate = Number(
    err?.status || err?.statusCode || err?.httpStatus
  );
  const status =
    statusCandidate >= 400 && statusCandidate < 600 ? statusCandidate : 500;
  const errorId = randomUUID();

  logger.error(
    {
      err,
      errorId,
      path: req.path,
      method: req.method,
      // Avoid logging sensitive data in body if possible, or sanitize it
      // For now, we log it but be careful with passwords
      // body: req.body, 
    },
    'Unhandled request error'
  );

  const isServerError = status >= 500;
  res.status(status).json({
    error: isServerError
      ? 'Erro interno inesperado'
      : err?.message || 'Erro na requisição',
    errorId,
  });
}
