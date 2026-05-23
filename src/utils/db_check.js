
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkAgencies() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI not found');
        await mongoose.connect(uri);
        const ShippingAgency = mongoose.model('ShippingAgency', new mongoose.Schema({}, { strict: false }), 'shippingagencies');
        const agencies = await ShippingAgency.find();
        console.log('--- DATABASE CHECK ---');
        console.log(JSON.stringify(agencies, null, 2));
        console.log('--- END CHECK ---');
        await mongoose.disconnect();
    } catch (err) {
        console.error('ERROR:', err);
    }
}

checkAgencies();
