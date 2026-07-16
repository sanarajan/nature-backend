import { injectable } from 'tsyringe';
import mongoose from 'mongoose';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';

@injectable()
export class OrderRepository implements IOrderRepository {
    private async getInfluencerMatchCondition(influencerId: string): Promise<any> {
        const objId = mongoose.Types.ObjectId.isValid(influencerId) ? new mongoose.Types.ObjectId(influencerId) : influencerId;
        const orConditions: any[] = [
            { influencerId: objId },
            { influencerId: influencerId.toString() },
            { 'orderedProducts.influencerId': objId },
            { 'orderedProducts.influencerId': influencerId.toString() },
            { 'orderedProducts.discounts.influencerDiscount.influencerId': objId },
            { 'orderedProducts.discounts.influencerDiscount.influencerId': influencerId.toString() }
        ];
        try {
            const user = await UserModel.findById(influencerId).select('influencerCode').exec();
            if (user && user.influencerCode) {
                const codeRegex = new RegExp(`^${user.influencerCode.trim()}$`, 'i');
                orConditions.push({ influencerCode: { $regex: codeRegex } });
                orConditions.push({ 'orderedProducts.influencerCode': { $regex: codeRegex } });
                orConditions.push({ 'orderedProducts.discounts.influencerDiscount.influencerCode': { $regex: codeRegex } });
            }
        } catch (e) {
            // ignore user lookup failure
        }
        return { $or: orConditions };
    }

    async findRecentOrdersByInfluencerId(influencerId: string, limit: number = 10): Promise<any[]> {
        const matchCondition = await this.getInfluencerMatchCondition(influencerId);
        const query = {
            $and: [
                matchCondition,
                {
                    $nor: [
                        { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                        { paymentStatus: { $in: ['Failed', 'Expired'] } }
                    ]
                }
            ]
        };
        return OrderModel.find(query)
            .select('orderId totalAmount influencerCommissionAmount influencerCommissionStatus createdAt orderedProducts influencerSource influencerCommissionRate')
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }

    async countByInfluencerId(influencerId: string): Promise<number> {
        const matchCondition = await this.getInfluencerMatchCondition(influencerId);
        const query = {
            $and: [
                matchCondition,
                {
                    $nor: [
                        { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                        { paymentStatus: { $in: ['Failed', 'Expired'] } }
                    ]
                }
            ]
        };
        return OrderModel.countDocuments(query).exec();
    }

    async findCompletedByInfluencerId(influencerId: string): Promise<any[]> {
        const matchCondition = await this.getInfluencerMatchCondition(influencerId);
        const query = {
            $and: [
                matchCondition,
                {
                    $nor: [
                        { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                        { paymentStatus: { $in: ['Failed', 'Expired'] } }
                    ]
                },
                {
                    $or: [
                        { influencerCommissionStatus: 'APPROVED' },
                        { 'orderedProducts.influencerCommissionStatus': 'APPROVED' }
                    ]
                }
            ]
        };
        return OrderModel.find(query).exec();
    }

    async getInfluencerAnalytics(influencerId: string): Promise<any> {
        const matchCondition = await this.getInfluencerMatchCondition(influencerId);

        const result = await OrderModel.aggregate([
            { $match: matchCondition },
            {
                $facet: {
                    orderCounts: [
                        {
                            $match: {
                                $nor: [
                                    { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                                    { paymentStatus: { $in: ['Failed', 'Expired'] } }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                completedOrders: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$globalOrderStatus', ['Delivered', 'DELIVERED', 'COMPLETED', 'Completed']] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                cancelledOrders: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$globalOrderStatus', ['Cancelled', 'CANCELLED']] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                returnedOrders: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$globalOrderStatus', ['Returned', 'RETURNED', 'Return Approved', 'Closed']] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    commissions: [
                        {
                            $match: {
                                $nor: [
                                    { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                                    { paymentStatus: { $in: ['Failed', 'Expired'] } }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                pendingCommission: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$globalOrderStatus', ['Cancelled', 'CANCELLED', 'Returned', 'RETURNED', 'Return Approved', 'Closed']] },
                                            0,
                                            {
                                                $cond: [
                                                    {
                                                        $gt: [
                                                            {
                                                                $reduce: {
                                                                    input: { $ifNull: ['$orderedProducts', []] },
                                                                    initialValue: 0,
                                                                    in: { $add: ['$$value', { $ifNull: ['$$this.influencerCommissionAmount', 0] }] }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    },
                                                    {
                                                        $reduce: {
                                                            input: { $ifNull: ['$orderedProducts', []] },
                                                            initialValue: 0,
                                                            in: {
                                                                $add: [
                                                                    '$$value',
                                                                    {
                                                                        $cond: [
                                                                            { $eq: ['$$this.influencerCommissionStatus', 'PENDING'] },
                                                                            { $ifNull: ['$$this.influencerCommissionAmount', 0] },
                                                                            0
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    {
                                                        $cond: [
                                                            { $eq: ['$influencerCommissionStatus', 'PENDING'] },
                                                            { $ifNull: ['$influencerCommissionAmount', 0] },
                                                            0
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                },
                                approvedCommission: {
                                    $sum: {
                                        $cond: [
                                            { $in: ['$globalOrderStatus', ['Cancelled', 'CANCELLED', 'Returned', 'RETURNED', 'Return Approved', 'Closed']] },
                                            0,
                                            {
                                                $cond: [
                                                    {
                                                        $gt: [
                                                            {
                                                                $reduce: {
                                                                    input: { $ifNull: ['$orderedProducts', []] },
                                                                    initialValue: 0,
                                                                    in: { $add: ['$$value', { $ifNull: ['$$this.influencerCommissionAmount', 0] }] }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    },
                                                    {
                                                        $reduce: {
                                                            input: { $ifNull: ['$orderedProducts', []] },
                                                            initialValue: 0,
                                                            in: {
                                                                $add: [
                                                                    '$$value',
                                                                    {
                                                                        $cond: [
                                                                            { $eq: ['$$this.influencerCommissionStatus', 'APPROVED'] },
                                                                            { $ifNull: ['$$this.influencerCommissionAmount', 0] },
                                                                            0
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    {
                                                        $cond: [
                                                            { $eq: ['$influencerCommissionStatus', 'APPROVED'] },
                                                            { $ifNull: ['$influencerCommissionAmount', 0] },
                                                            0
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    uniqueCustomers: [
                        {
                            $match: {
                                userId: { $exists: true, $ne: null },
                                $nor: [
                                    { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                                    { paymentStatus: { $in: ['Failed', 'Expired'] } }
                                ]
                            }
                        },
                        { $group: { _id: '$userId' } },
                        { $count: 'count' }
                    ],
                    topProducts: [
                        {
                            $match: {
                                $nor: [
                                    { globalOrderStatus: { $in: ['PENDING', 'Pending', 'Expired', 'EXPIRED'] }, paymentStatus: { $ne: 'Completed' } },
                                    { paymentStatus: { $in: ['Failed', 'Expired'] } }
                                ]
                            }
                        },
                        { $unwind: '$orderedProducts' },
                        { $match: { 'orderedProducts.orderStatus': { $nin: ['Cancelled', 'Returned'] } } },
                        {
                            $group: {
                                _id: { $ifNull: ['$orderedProducts.productId', '$orderedProducts._id'] },
                                productName: { $first: '$orderedProducts.productName' },
                                image: { $first: '$orderedProducts.image' },
                                totalSold: { $sum: { $ifNull: ['$orderedProducts.quantity', 1] } },
                                totalRevenue: { $sum: { $multiply: [{ $ifNull: ['$orderedProducts.finalPrice', 0] }, { $ifNull: ['$orderedProducts.quantity', 1] }] } },
                                totalCommission: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $or: [
                                                    { $in: ['$orderedProducts.influencerCommissionStatus', ['APPROVED', 'PENDING']] },
                                                    { $in: ['$influencerCommissionStatus', ['APPROVED', 'PENDING']] }
                                                ]
                                            },
                                            {
                                                $cond: [
                                                    { $gt: [{ $ifNull: ['$orderedProducts.influencerCommissionAmount', 0] }, 0] },
                                                    '$orderedProducts.influencerCommissionAmount',
                                                    {
                                                        $cond: [
                                                            { $gt: [{ $ifNull: ['$totalAmount', 0] }, 0] },
                                                            {
                                                                $round: [
                                                                    {
                                                                        $multiply: [
                                                                            { $ifNull: ['$influencerCommissionAmount', 0] },
                                                                            { $divide: [{ $multiply: [{ $ifNull: ['$orderedProducts.finalPrice', 0] }, { $ifNull: ['$orderedProducts.quantity', 1] }] }, '$totalAmount'] }
                                                                        ]
                                                                    },
                                                                    2
                                                                ]
                                                            },
                                                            0
                                                        ]
                                                    }
                                                ]
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        },
                        { $sort: { totalSold: -1 } },
                        { $limit: 5 }
                    ]
                }
            }
        ]).exec();

        const data = result[0] || {};
        const counts = (data.orderCounts && data.orderCounts[0]) || {
            totalOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0
        };
        const comms = (data.commissions && data.commissions[0]) || {
            pendingCommission: 0,
            approvedCommission: 0
        };

        const totalOrders = counts.totalOrders || 0;
        const completedOrders = counts.completedOrders || 0;
        const cancelledOrders = counts.cancelledOrders || 0;
        const returnedOrders = counts.returnedOrders || 0;
        const pendingOrders = Math.max(0, totalOrders - completedOrders - cancelledOrders - returnedOrders);

        const uniqueCustomers = (data.uniqueCustomers && data.uniqueCustomers[0] && data.uniqueCustomers[0].count) || 0;
        const topProducts = data.topProducts || [];

        return {
            totalOrders,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            returnedOrders,
            pendingCommission: Number((comms.pendingCommission || 0).toFixed(2)),
            approvedCommission: Number((comms.approvedCommission || 0).toFixed(2)),
            uniqueCustomers,
            topProducts
        };
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
