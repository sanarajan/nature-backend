
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        const offers = await ComboOfferModel.find({ isDeleted: { $ne: true } }).lean();
        console.log(`Found ${offers.length} offers`);
        offers.forEach(o => {
            console.log(`ID: ${o._id} | Name: ${o.offerName} | Image: ${o.imageUrl || 'MISSING'}`);
            if (o.imageUrl === null) console.log('   (Explicitly NULL)');
        });
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

debugAll();
