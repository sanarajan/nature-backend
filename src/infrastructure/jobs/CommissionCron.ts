import cron from 'node-cron';
import { processPendingCommissions } from '../cron/InfluencerCommissionCron';

export const startCommissionCron = () => {
    // Run every 12 hours (at 00:00 and 12:00)
    cron.schedule('0 0,12 * * *', async () => {
        console.log('[CRON] Starting Commission Approval Job (CommissionCron)...');
        await processPendingCommissions();
    });
    
    console.log('[CRON] Commission Approval Job registered successfully.');
};
