
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({
    username: String,
    role: String,
    email: String
});
const User = mongoose.model('User', userSchema);

async function run() {
    console.log('Connecting to', process.env.MONGODB_URI);
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naturalayam');
        const users = await User.find({}, 'username role email');
        console.log('Result:', JSON.stringify(users));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
