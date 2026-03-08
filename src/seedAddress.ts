import 'reflect-metadata';
import mongoose from 'mongoose';
import { connectDB } from './infrastructure/config/database';
import { AddressModel } from './infrastructure/database/models/AddressModel';
import { UserModel } from './infrastructure/database/models/UserModel';

const seedAddresses = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB for address seeding...');

        const user = await UserModel.findOne({ email: 'admin@gmail.com' });
        if (!user) {
            console.error('Admin user not found. Run seed.ts first.');
            process.exit(1);
        }

        // Create dummy addresses
        const addresses = [
            {
                house: 'Green Villa, 101',
                place: 'Near MG Road',
                city: 'Kochi',
                district: 'Ernakulam',
                state: 'Kerala',
                pincode: '682001'
            },
            {
                house: 'Flat 4B, Sky Heights',
                place: 'Marine Drive',
                city: 'Kochi',
                district: 'Ernakulam',
                state: 'Kerala',
                pincode: '682031'
            },
            {
                house: 'TC 15/1234, Rose Garden',
                place: 'Vazhuthacaud',
                city: 'Trivandrum',
                district: 'Trivandrum',
                state: 'Kerala',
                pincode: '695014'
            }
        ];

        const savedAddresses = await AddressModel.insertMany(addresses);
        const addressIds = savedAddresses.map(addr => addr._id);

        user.address_ids = addressIds as any;
        await user.save();

        console.log(`Successfully seeded ${savedAddresses.length} addresses and linked to admin user.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding addresses:', error);
        process.exit(1);
    }
};

seedAddresses();
