"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Adjust path as needed
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nature-db';
async function checkProducts() {
    try {
        await mongoose_1.default.connect(mongoURI);
        console.log('Connected to MongoDB');
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection is not established.');
        }
        const products = await db.collection('products').find({ isActive: true }).toArray();
        console.log(`Found ${products.length} active products`);
        if (products.length > 0) {
            console.log('Sample Product:', JSON.stringify(products[0], null, 2));
        }
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        console.error('Error:', err);
    }
}
checkProducts();
