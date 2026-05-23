
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ComboOfferModel } from '../infrastructure/database/models/ComboOfferModel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkSchema() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');
        
        console.log('--- COMBO OFFER SCHEMA PATHS ---');
        const schema = (ComboOfferModel as any).schema;
        console.log(Object.keys(schema.paths));
        
        if (schema.paths.imageUrl) {
            console.log('SUCCESS: imageUrl exists in schema');
        } else {
            console.error('ERROR: imageUrl MISSING from schema');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
