import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../common/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  // Defensive connection event listeners
  mongoose.connection.on('error', (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'MongoDB asynchronous connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected from server');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB successfully re-established connection');
  });

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    logger.info(
      { host: conn.connection.host, database: conn.connection.name },
      'MongoDB connected successfully with connection pool limits'
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'MongoDB initial connection failure');
    throw error;
  }
};
