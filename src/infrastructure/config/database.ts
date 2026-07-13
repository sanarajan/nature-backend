import mongoose from 'mongoose';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/logger';

mongoose.set('strictQuery', false);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/naturalayam');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
