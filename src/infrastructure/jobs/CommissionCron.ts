import cron from 'node-cron';
import { OrderModel } from '../database/models/OrderModel';
import { UserModel } from '../database/models/UserModel';

export const startCommissionCron = () => {
    // Run every 12 hours (at 00:00 and 12:00)
    cron.schedule('0 0,12 * * *', async () => {
        console.log('[CRON] Starting Commission Approval Job...');
        try {
            const now = new Date();
            
            // Find orders where commission is PENDING, and the return window has expired
            // Also ensure the order is in a completed or delivered state.
            const eligibleOrders = await OrderModel.find({
                influencerCommissionStatus: 'PENDING',
                returnExpiryDate: { $lt: now },
                globalOrderStatus: { $in: ['DELIVERED', 'COMPLETED'] }
            });

            console.log(`[CRON] Found ${eligibleOrders.length} eligible orders for commission approval.`);

            let processedCount = 0;

            for (const order of eligibleOrders) {
                if (!order.influencerId || !order.influencerCommissionAmount) continue;

                const influencer = await UserModel.findById(order.influencerId);
                if (!influencer) continue;

                // 1. Update order commission status
                order.influencerCommissionStatus = 'APPROVED';
                
                // 2. Safely update influencer wallet
                // Decrease pending, increase wallet balance and total earned
                const commission = order.influencerCommissionAmount;
                
                const currentPending = influencer.influencerPendingBalance || 0;
                influencer.influencerPendingBalance = Math.max(0, currentPending - commission);
                influencer.influencerWalletBalance = (influencer.influencerWalletBalance || 0) + commission;
                influencer.influencerTotalEarned = (influencer.influencerTotalEarned || 0) + commission;

                await Promise.all([
                    order.save(),
                    influencer.save()
                ]);
                
                processedCount++;
            }

            console.log(`[CRON] Successfully processed and approved ${processedCount} commissions.`);

        } catch (error) {
            console.error('[CRON] Error during Commission Approval Job:', error);
        }
    });
    
    console.log('[CRON] Commission Approval Job registered successfully.');
};
