import { Request, Response } from 'express';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { WithdrawalRequestModel } from '../../infrastructure/database/models/WithdrawalRequestModel';
import { UserRole } from '../../constants/enums/UserRole';

export class InfluencerController {
    public static async getDashboardData(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const influencer = await UserModel.findById(userId);
            
            if (!influencer) return res.status(404).json({ success: false, message: 'User not found' });

            const recentOrders = await OrderModel.find({ influencerId: userId })
                .select('orderId totalAmount influencerCommissionAmount influencerCommissionStatus createdAt')
                .sort({ createdAt: -1 })
                .limit(10);

            const withdrawalRequests = await WithdrawalRequestModel.find({ influencerId: userId })
                .sort({ createdAt: -1 })
                .limit(5);

            res.status(200).json({
                success: true,
                data: {
                    walletBalance: influencer.influencerWalletBalance || 0,
                    pendingBalance: influencer.influencerPendingBalance || 0,
                    totalEarned: influencer.influencerTotalEarned || 0,
                    totalWithdrawn: influencer.influencerTotalWithdrawn || 0,
                    referralCode: influencer.influencerCode,
                    recentOrders,
                    withdrawalRequests
                }
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async requestWithdrawal(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { amount } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid amount' });
            }

            const influencer = await UserModel.findById(userId);
            if (!influencer) return res.status(404).json({ success: false, message: 'User not found' });

            if ((influencer.influencerWalletBalance || 0) < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }

            // Check if there's already a pending request to prevent spam
            const existingPending = await WithdrawalRequestModel.findOne({ influencerId: userId, status: 'Pending' });
            if (existingPending) {
                return res.status(400).json({ success: false, message: 'You already have a pending withdrawal request' });
            }

            const request = new WithdrawalRequestModel({
                influencerId: userId,
                amount
            });

            await request.save();

            res.status(200).json({ success: true, message: 'Withdrawal requested successfully', data: request });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public static async upgradeToInfluencer(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const user = await UserModel.findById(userId);

            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.isInfluencer) {
                return res.status(200).json({ success: true, message: 'Already an influencer', data: { user } });
            }

            // Generate unique influencer code
            const baseCode = (user.displayName || user.username || 'INF').substring(0, 4).toUpperCase();
            const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();
            const influencerCode = `${baseCode}${uniqueSuffix}`;

            user.isInfluencer = true;
            user.influencerCode = influencerCode;
            user.commissionPercentage = 5; // Default 5%
            user.influencerStatus = 'Active';
            user.influencerWalletBalance = 0;
            user.influencerPendingBalance = 0;
            user.influencerTotalEarned = 0;
            user.influencerTotalWithdrawn = 0;

            await user.save();

            res.status(200).json({ success: true, message: 'Upgraded to influencer successfully', data: { user } });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
