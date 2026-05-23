
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        const offers = await ComboOfferModel.find({}).lean();
        console.log('--- ALL COMBO OFFERS ---');
        offers.forEach(o => {
            console.log(`Name: ${o.offerName}`);
            console.log(`Image URL: ${o.imageUrl || 'MISSING'}`);
            console.log(`RAW: ${JSON.stringify(o)}`);
            console.log('---');
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
