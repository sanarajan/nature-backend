import cron from 'node-cron';
import { NaturePointBatchModel } from '../database/models/NaturePointBatchModel';
import { NaturePointTransactionModel } from '../database/models/NaturePointTransactionModel';

export const startNaturePointsExpiryCron = () => {
    // Run at midnight every day
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting Nature Points Expiry Job');
        try {
            const now = new Date();
            
            // Find batches that have expired and still have remaining points
            const expiredBatches = await NaturePointBatchModel.find({
                expiryDate: { $lte: now },
                remainingPoints: { $gt: 0 },
                status: 'Active'
            });

            if (expiredBatches.length === 0) {
                console.log('[CRON] No expiring Nature Points batches found.');
                return;
            }

            console.log(`[CRON] Found ${expiredBatches.length} batches to expire.`);

            let processedCount = 0;

            for (const batch of expiredBatches) {
                const pointsToExpire = batch.remainingPoints;
                
                batch.remainingPoints = 0;
                batch.status = 'Expired';
                await batch.save();

                // Create a transaction record for the expiry
                await NaturePointTransactionModel.create({
                    userId: batch.userId,
                    type: 'Expired',
                    amount: pointsToExpire,
                    description: 'Points expired',
                    orderId: batch.sourceId // link back to original order
                });
                
                processedCount++;
            }

            console.log(`[CRON] Successfully expired ${processedCount} point batches.`);

        } catch (error) {
            console.error('[CRON ERROR] Nature Points Expiry Job failed:', error);
        }
    });

    console.log('[CRON] Nature Points Expiry Job registered successfully.');
};
