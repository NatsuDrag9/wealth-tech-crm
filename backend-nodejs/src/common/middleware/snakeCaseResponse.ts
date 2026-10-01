import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const camelToSnake = (str: string): string =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

export const transformKeysToSnakeCase = (
  data: unknown,
  seen = new WeakSet<object>()
): unknown => {
  let target = data;

  // If a Mongoose Document instance was passed, convert to plain JS object first
  if (
    target !== null &&
    typeof target === 'object' &&
    typeof (target as { toObject?: () => unknown }).toObject === 'function'
  ) {
    target = (target as { toObject: () => unknown }).toObject();
  }

  // Prevent infinite recursion on circular references
  if (target !== null && typeof target === 'object') {
    if (seen.has(target as object)) {
      return null;
    }
    seen.add(target as object);
  }

  if (Array.isArray(target)) {
    return target.map((item) => transformKeysToSnakeCase(item, seen));
  }

  // Preserve null, primitives, Dates, Buffers, and MongoDB ObjectIds
  if (
    target !== null &&
    typeof target === 'object' &&
    !(target instanceof Date) &&
    !(target instanceof mongoose.Types.ObjectId) &&
    !Buffer.isBuffer(target)
  ) {
    const record = target as Record<string, unknown>;
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      // Don't modify private Mongoose fields or internal symbols
      if (key.startsWith('__') || key.startsWith('$')) {
        continue;
      }
      transformed[camelToSnake(key)] = transformKeysToSnakeCase(value, seen);
    }
    return transformed;
  }

  return target;
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
