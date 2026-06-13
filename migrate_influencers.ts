import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from './src/infrastructure/database/models/UserModel';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/natural_ayam';

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await UserModel.updateMany(
            { role: 'INFLUENCER' },
            { $set: { role: 'USER' } }
        );

        console.log(`Migration complete. Modified ${result.modifiedCount} records.`);
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrate();
