"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("./infrastructure/config/database");
const AddressModel_1 = require("./infrastructure/database/models/AddressModel");
const UserModel_1 = require("./infrastructure/database/models/UserModel");
const seedAddresses = async () => {
    try {
        await (0, database_1.connectDB)();
        console.log('Connected to MongoDB for address seeding...');
        const user = await UserModel_1.UserModel.findOne({ email: 'admin@gmail.com' });
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
        const savedAddresses = await AddressModel_1.AddressModel.insertMany(addresses);
        const addressIds = savedAddresses.map(addr => addr._id);
        user.address_ids = addressIds;
        await user.save();
        console.log(`Successfully seeded ${savedAddresses.length} addresses and linked to admin user.`);
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding addresses:', error);
        process.exit(1);
    }
};
seedAddresses();
