const mongoose = require('mongoose');
require('dotenv').config();
const { ProductModel } = require('./dist/infrastructure/database/models/ProductModel'); // try dist

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        console.log('Connected');
        const res = await ProductModel.findByIdAndUpdate('6a2992c08a9df2a1b2d8a782', {
            labelControl: 'TEST LABEL via MONGOOSE',
            specialPublishingClaimsNote: 'TEST PUBLISHING via MONGOOSE'
        }, { new: true });
        console.log('Updated product:', res);
    } catch(err) {
        console.log("Error:", err.message);
    }
    process.exit(0);
}
run();
