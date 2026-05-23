
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        const now = new Date();
        const offers = await ComboOfferModel.find({
            status: true,
            isDeleted: { $ne: true }
        });
        
        console.log(`Found ${offers.length} active combo offers total`);
        offers.forEach(o => {
            const isActive = o.startDate <= now && o.endDate >= now;
            console.log(`- ${o.offerName}: Image: ${o.imageUrl || 'NONE'} (Active? ${isActive})`);
            console.log(`  Products: ${JSON.stringify(o.products)}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
