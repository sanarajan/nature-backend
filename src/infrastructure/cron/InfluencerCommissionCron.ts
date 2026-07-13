import cron from 'node-cron';
import { OrderModel } from '../database/models/OrderModel';
import { UserModel } from '../database/models/UserModel';

export const startInfluencerCommissionCron = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting Influencer Commission Approval Job');
        try {
            const now = new Date();
            
            // Find eligible orders
            // 1. Commission is PENDING
            // 2. Order is DELIVERED or COMPLETED (i.e., not returned or cancelled)
            // 3. The return window has expired
            const eligibleOrders = await OrderModel.find({
                influencerCommissionStatus: 'PENDING',
                globalOrderStatus: { $in: ['DELIVERED', 'COMPLETED'] },
                returnExpiryDate: { $lte: now }
            });

            if (eligibleOrders.length === 0) {
                console.log('[CRON] No eligible orders found for commission approval.');
                return;
            }

            for (const order of eligibleOrders) {
                if (!order.influencerId || !order.influencerCommissionAmount) {
                    continue;
                }

                const influencer = await UserModel.findById(order.influencerId);
                if (influencer) {
                    const commissionAmount = order.influencerCommissionAmount;

                    // Update influencer balances
                    influencer.influencerWalletBalance = (influencer.influencerWalletBalance || 0) + commissionAmount;
                    influencer.influencerTotalEarned = (influencer.influencerTotalEarned || 0) + commissionAmount;
                    influencer.influencerPendingBalance = Math.max(0, (influencer.influencerPendingBalance || 0) - commissionAmount);
                    
                    await influencer.save();

                    // Update order status
                    order.influencerCommissionStatus = 'APPROVED';
                    await order.save();
                    
                    console.log(`[CRON] Approved commission of ${commissionAmount} for Influencer ${influencer.influencerCode} on Order ${order.orderId}`);
                }
            }
            console.log('[CRON] Influencer Commission Approval Job completed.');
        } catch (error) {
            console.error('[CRON ERROR] Influencer Commission Approval Job failed:', error);
        }
    });
};
