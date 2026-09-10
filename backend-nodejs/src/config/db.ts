import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../common/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    logger.info(
      { host: conn.connection.host, database: conn.connection.name },
      'MongoDB connected successfully'
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'MongoDB connection failure');
  }
};
