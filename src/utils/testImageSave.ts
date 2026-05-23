
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';
import { ProductModel } from '../infrastructure/database/models/ProductModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testSave() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        const products = await ProductModel.find().limit(1);
        if (products.length === 0) {
            console.error('No products found to create combo');
            process.exit(1);
        }

        const testOffer = new ComboOfferModel({
            offerName: 'Test Image Offer ' + Date.now(),
            products: [{ productId: products[0]._id, requiredQuantity: 2 }],
            discountType: 'amount',
            discountValue: 10,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
            status: true
        });

        const saved = await testOffer.save();
        console.log('Saved Offer ID:', saved._id);
        console.log('Saved Object:', JSON.stringify(saved, null, 2));
        
        const fetched = await ComboOfferModel.findById(saved._id);
        console.log('Fetched imageUrl:', fetched?.imageUrl);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testSave();
