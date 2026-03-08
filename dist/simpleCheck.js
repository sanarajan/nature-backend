"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const userSchema = new mongoose_1.default.Schema({
    username: String,
    role: String,
    email: String
});
const User = mongoose_1.default.model('User', userSchema);
async function run() {
    console.log('Connecting to', process.env.MONGODB_URI);
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naturalayam');
        const users = await User.find({}, 'username role email');
        console.log('Result:', JSON.stringify(users));
    }
    catch (e) {
        console.error('Error:', e);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
run();
