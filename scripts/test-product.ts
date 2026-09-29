import mongoose from 'mongoose';
import { ProductModel } from './src/infrastructure/database/models/ProductModel';
import { UnitModel } from './src/infrastructure/database/models/UnitModel';

async function test() {
    await mongoose.connect('mongodb://localhost:27017/naturalayam', { useNewUrlParser: true, useUnifiedTopology: true } as any);
    
    const product = await ProductModel.findOne().populate('categoryId').populate('subcategoryId').populate('unitId', 'unitName');
    
    console.log(JSON.stringify(product?.toObject(), null, 2));
    process.exit(0);
}

test().catch(console.error);
