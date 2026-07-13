import { STATUS_CODES } from '../constants/statusCodes';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, STATUS_CODES.BAD_REQUEST);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, STATUS_CODES.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, STATUS_CODES.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, STATUS_CODES.FORBIDDEN);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, STATUS_CODES.CONFLICT);
  }
}
