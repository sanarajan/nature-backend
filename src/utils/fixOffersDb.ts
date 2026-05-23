
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        const res = await ComboOfferModel.updateMany(
            { imageUrl: { $exists: false } },
            { $set: { imageUrl: null } }
        );
        console.log('Updated existing offers with null imageUrl:', res.modifiedCount);

        const offer = await ComboOfferModel.findOne({ offerName: 'offer1' });
        if (offer) {
            offer.imageUrl = 'https://res.cloudinary.com/deh6j5l21/image/upload/v1711150000/natural_ayam/combo_offers/sample.jpg';
            await offer.save();
            console.log('Hardcoded image URL for offer1');
        } else {
            console.error('offer1 not found');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
