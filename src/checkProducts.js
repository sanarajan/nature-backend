const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/naturalayam';

async function checkProducts() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
        console.log('Categories:', categories.map(c => ({ id: c._id, name: c.categoryName, isActive: c.isActive })));

        const subcategories = await mongoose.connection.db.collection('subcategories').find({}).toArray();
        console.log('Subcategories:', subcategories.map(s => ({ id: s._id, name: s.subcategoryName, catId: s.categoryId, isActive: s.isActive })));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkProducts();
