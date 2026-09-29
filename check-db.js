const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false, collection: 'products' }));
    const product = await Product.findOne().sort({ createdAt: -1 });
    console.log('Latest product:', product);
    process.exit(0);
}
run();
