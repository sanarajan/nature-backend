import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Adjust path as needed
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nature-db';

async function checkProducts() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection is not established.');
        }
        const products = await db.collection('products').find({ isActive: true }).toArray();
        console.log(`Found ${products.length} active products`);

        if (products.length > 0) {
            console.log('Sample Product:', JSON.stringify(products[0], null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkProducts();
