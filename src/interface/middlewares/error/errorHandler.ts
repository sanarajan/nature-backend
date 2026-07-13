import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { env } from '../../../shared/config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    logger.warn(`Mongoose ValidationError: ${err.message}`);
    res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('Invalid JWT token');
    res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token, please log in again.',
    });
    return;
  }
  
  if (err.name === 'TokenExpiredError') {
    logger.warn('Expired JWT token');
    res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Token has expired, please log in again.',
    });
    return;
  }

  // Fallback for unexpected errors
  logger.error(`Unexpected Error: ${err.message}`, { stack: err.stack });
  
  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
