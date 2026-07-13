import { injectable } from 'tsyringe';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { OrderModel } from '../models/OrderModel';

@injectable()
export class OrderRepository implements IOrderRepository {
    async findRecentOrdersByInfluencerId(influencerId: string, limit: number = 10): Promise<any[]> {
        return OrderModel.find({ influencerId })
            .select('orderId totalAmount influencerCommissionAmount influencerCommissionStatus createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }

    async countByInfluencerId(influencerId: string): Promise<number> {
        return OrderModel.countDocuments({ influencerId }).exec();
    }

    async findCompletedByInfluencerId(influencerId: string): Promise<any[]> {
        return OrderModel.find({ influencerId, influencerCommissionStatus: 'APPROVED' }).exec();
    }

    async createOrder(data: any): Promise<any> {
        const order = new OrderModel(data);
        return await order.save();
    }

    async findOrderById(id: string): Promise<any> {
        return await OrderModel.findById(id);
    }

    async findOrderByIdAndUserId(id: string, userId: string): Promise<any> {
        return await OrderModel.findOne({ _id: id, userId });
    }

    async findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<any> {
        return await OrderModel.findOne({ razorpayOrderId });
    }

    async findOrderByRazorpayPaymentId(razorpayPaymentId: string): Promise<any> {
        return await OrderModel.findOne({ razorpayPaymentId });
    }

    async findPendingOrderForUser(userId: string, targetPaymentMethod: string): Promise<any> {
        return await OrderModel.findOne({ 
            userId, 
            paymentStatus: { $in: ['Pending', 'Failed'] }, 
            globalOrderStatus: 'PENDING'
        }).sort({ createdAt: -1 });
    }

    async findAllOrders(): Promise<any[]> {
        return await OrderModel.find().populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' }).sort({ createdAt: -1 });
    }

    async findOrdersByUserId(userId: string): Promise<any[]> {
        return await OrderModel.find({ userId }).sort({ createdAt: -1 });
    }

    async updateOrder(id: string, data: any): Promise<any> {
        return await OrderModel.findByIdAndUpdate(id, data, { new: true });
    }
}
