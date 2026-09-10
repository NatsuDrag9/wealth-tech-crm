import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const camelToSnake = (str: string): string =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

export const transformKeysToSnakeCase = (data: unknown): unknown => {
  if (Array.isArray(data)) {
    return data.map(transformKeysToSnakeCase);
  }

  // Preserve null, primitives, Dates, Buffers, and MongoDB ObjectIds
  if (
    data !== null &&
    typeof data === 'object' &&
    !(data instanceof Date) &&
    !(data instanceof mongoose.Types.ObjectId) &&
    !Buffer.isBuffer(data)
  ) {
    const record = data as Record<string, unknown>;
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      // Don't modify private Mongoose fields like __v or internal symbols
      if (key.startsWith('__')) {
        continue;
      }
      transformed[camelToSnake(key)] = transformKeysToSnakeCase(value);
    }
    return transformed;
  }

  return data;
};

export const snakeCaseResponse = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    return originalJson(transformKeysToSnakeCase(body));
  };

  next();
};
