import { Request, Response } from 'express';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { WithdrawalRequestModel } from '../../infrastructure/database/models/WithdrawalRequestModel';
import { UserRole } from '../../constants/enums/UserRole';

export class AdminInfluencerController {
    public static async getAllInfluencers(req: Request, res: Response) {
        try {
            const influencers = await UserModel.find({ isInfluencer: true }).sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: influencers });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async getInfluencerStats(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const influencer = await UserModel.findById(id);
            if (!influencer) return res.status(404).json({ success: false, message: 'Influencer not found' });

            const totalOrders = await OrderModel.countDocuments({ influencerId: id });
            const completedOrders = await OrderModel.find({ influencerId: id, influencerCommissionStatus: 'APPROVED' });
            
            const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

            res.status(200).json({
                success: true,
                data: {
                    influencer,
                    totalOrders,
                    totalSales
                }
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async updateInfluencer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { displayName, email, phoneNumber, commissionPercentage, influencerStatus } = req.body;
            
            const influencer = await UserModel.findByIdAndUpdate(id, {
                displayName, email, phoneNumber, commissionPercentage, influencerStatus
            }, { new: true });
            
            res.status(200).json({ success: true, data: influencer });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async getWithdrawalRequests(req: Request, res: Response) {
        try {
            const requests = await WithdrawalRequestModel.find()
                .populate({ path: 'influencerId', select: 'displayName email influencerCode influencerWalletBalance' })
                .sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: requests });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async processWithdrawal(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status, remarks } = req.body;

            const request = await WithdrawalRequestModel.findById(id).populate('influencerId');
            if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
            if (request.status !== 'Pending') return res.status(400).json({ success: false, message: 'Already processed' });

            const influencer: any = request.influencerId;

            if (status === 'Approved') {
                if (influencer.influencerWalletBalance < request.amount) {
                    return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
                }
                influencer.influencerWalletBalance -= request.amount;
                influencer.influencerTotalWithdrawn = (influencer.influencerTotalWithdrawn || 0) + request.amount;
                await influencer.save();
            }

            request.status = status;
            request.adminRemarks = remarks;
            request.processedAt = new Date();
            await request.save();

            res.status(200).json({ success: true, data: request });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
