const mongoose = require('mongoose');

async function test() {
    await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
    
    // Dynamic import is needed if the backend is using ES modules or we can just query directly
    const productSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.model('Product', productSchema, 'products');
    
    const p = await Product.findOne({});
    console.log(p);
    
    process.exit(0);
}

test().catch(console.error);
