import 'reflect-metadata';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { OrderModel } from './src/infrastructure/database/models/OrderModel';
import { UpdateOrderStatusUseCase } from './src/application/usecases/admin/AdminOrderUseCases';

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nature');
    const u = new UpdateOrderStatusUseCase(null as any);
    
    // Create an order
    const order = new OrderModel({
        userId: new mongoose.Types.ObjectId(),
        orderId: 'NAT9999',
        totalAmount: 100,
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        globalOrderStatus: 'PENDING',
        orderedProducts: [
            { productId: new mongoose.Types.ObjectId(), productName: 'P1', orderStatus: 'Pending', quantity: 1, price: 50 },
            { productId: new mongoose.Types.ObjectId(), productName: 'P2', orderStatus: 'Pending', quantity: 1, price: 50 }
        ],
        shippingAddress: { name: 'Test', address: '123', city: 'City', state: 'State', zipCode: '123', phone: '123' }
    });
    await order.save();
    
    console.log("Initial Global:", order.globalOrderStatus);
    
    const p1 = order.orderedProducts[0].productId.toString();
    const p2 = order.orderedProducts[1].productId.toString();
    
    await u.execute(order._id.toString(), { status: 'Shipped', productId: p1, shippingDetails: { agencyName: 'A', trackingNumber: '1', expectedDeliveryDate: new Date('2029-01-01') } }, 'Admin');
    const o2 = await OrderModel.findById(order._id);
    console.log("After P1 Global:", o2?.globalOrderStatus);
    
    await u.execute(order._id.toString(), { status: 'Shipped', productId: p2, shippingDetails: { agencyName: 'A', trackingNumber: '1', expectedDeliveryDate: new Date('2029-01-01') } }, 'Admin');
    const o3 = await OrderModel.findById(order._id);
    console.log("After P2 Global:", o3?.globalOrderStatus);
    
    await mongoose.disconnect();
}
run().catch(console.error);
