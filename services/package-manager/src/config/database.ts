import mongoose from 'mongoose';
import { config } from './index';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('  ✅ MongoDB connected');
  } catch (error) {
    console.error('  ❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}
