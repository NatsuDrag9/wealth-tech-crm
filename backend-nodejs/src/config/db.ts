import mongoose from 'mongoose';
import { config } from './environment';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn(`[MongoDB] Note: If MongoDB is not yet running locally or on Atlas, set MONGO_URI in .env`);
  }
};
