
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAgencies() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI not found');
        await mongoose.connect(uri);
        const ShippingAgency = mongoose.model('ShippingAgency', new mongoose.Schema({}, { strict: false }), 'shippingagencies');
        const agencies = await ShippingAgency.find();
        console.log('Found', agencies.length, 'agencies.');
        for (const agency of agencies) {
            if (agency.url && !agency.trackingUrlTemplate) {
                console.log(`Migrating ${agency.name}: url -> trackingUrlTemplate`);
                await ShippingAgency.updateOne({ _id: agency._id }, { $set: { trackingUrlTemplate: agency.url }, $unset: { url: "" } });
            }
        }
        console.log('Migration complete.');
        await mongoose.disconnect();
    } catch (err) {
        console.error('ERROR:', err);
    }
}

migrateAgencies();
