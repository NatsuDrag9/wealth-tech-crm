import { Request, Response, NextFunction } from 'express';
import mongoose, { mongo } from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from './AppError';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // 1. Custom Operational Application Errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // 2. Mongoose Schema Validation Errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  // 3. Mongoose CastError (e.g., malformed ObjectId)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.kind} format for path '${err.path}'`;
  }
  // 4. Native MongoDB Server Errors (e.g., E11000 Unique Index Violation)
  else if (err instanceof mongo.MongoServerError && err.code === 11000) {
    statusCode = 409;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'Record';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  // 5. JWT Authentication Errors
  else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Authentication token expired. Please refresh your session.';
  }
  // 6. Generic JavaScript standard error fallback
  else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};