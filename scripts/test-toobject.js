const mongoose = require('mongoose');

async function test() {
    await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
    
    const Product = mongoose.model('Product', new mongoose.Schema({
        unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
        productName: String
    }, { strict: false }), 'products');

    const Unit = mongoose.model('Unit', new mongoose.Schema({
        unitName: String
    }), 'units');
    
    let p = await Product.findOne({ _id: new mongoose.Types.ObjectId('6a0e04693319ec1ef4d6edfd') });
    await p.populate('unitId', 'unitName');
    
    console.log("Raw object:", p.unitId);
    console.log("toObject:", p.toObject().unitId);
    
    process.exit(0);
}

test().catch(console.error);
