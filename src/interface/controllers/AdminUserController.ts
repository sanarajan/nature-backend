import { Request, Response } from 'express';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import mongoose from 'mongoose';

export const getAllCustomers = async (req: Request, res: Response) => {
    try {
        const users = await UserModel.aggregate([
            { $match: { userType: 2 } }, // Only regular users
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'orders'
                }
            },
            {
                $lookup: {
                    from: 'addresses',
                    localField: 'address_ids',
                    foreignField: '_id',
                    as: 'addresses'
                }
            },
            {
                $project: {
                    _id: 1,
                    displayName: 1,
                    email: 1,
                    phoneNumber: 1,
                    imageUrl: 1,
                    isActive: 1,
                    createdAt: 1,
                    orderCount: { $size: '$orders' },
                    lastLocation: { $arrayElemAt: ['$addresses', 0] }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({ success: true, data: users });
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching customers' });
    }
};

export const updateCustomerStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        await UserModel.findByIdAndUpdate(id, { isActive });
        res.status(200).json({ success: true, message: 'Status updated successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating status' });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const ordersCount = await OrderModel.countDocuments({ userId: id });
        if (ordersCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete customer as they have existing orders.' 
            });
        }

        await UserModel.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Customer deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error deleting customer' });
    }
};
