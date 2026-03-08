"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const UserModel_1 = require("./infrastructure/database/models/UserModel");
dotenv_1.default.config();
async function checkUsers() {
    await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/naturalayam');
    const users = await UserModel_1.UserModel.find({});
    console.log('Users found:', users.map(u => ({ username: u.username, role: u.role, verified: u.verified })));
    await mongoose_1.default.disconnect();
}
checkUsers().catch(console.error);
