
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../infrastructure/database/models/UserModel';

dotenv.config({ path: '../../.env' }); // Adjusted for utils folder relative pathing logic if needed, but simple dotenv.config() often works if run from root.

async function checkUsers() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naturalayam');
    const users = await UserModel.find({});
    console.log('Users found:', users.map(u => ({ username: u.username, role: u.role, verified: u.verified })));
    await mongoose.disconnect();
}

checkUsers().catch(console.error);
