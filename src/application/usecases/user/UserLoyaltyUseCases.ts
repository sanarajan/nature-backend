import { NaturePointBatchModel } from '../../../infrastructure/database/models/NaturePointBatchModel';
import { NaturePointTransactionModel } from '../../../infrastructure/database/models/NaturePointTransactionModel';
import { LoyaltySettingModel } from '../../../infrastructure/database/models/LoyaltySettingModel';
import mongoose from 'mongoose';

export class UserLoyaltyUseCases {
    async earnPoints(userId: string, spendAmount: number, sourceId: string) {
        const settings = await LoyaltySettingModel.findOne();
        if (!settings || !settings.isLoyaltyEnabled) return 0;

        const pointsToEarn = Math.floor(spendAmount / settings.purchaseRewardSpendAmount) * settings.purchaseRewardEarnPoints;
        
        if (pointsToEarn <= 0) return 0;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + settings.pointValidityDays);

        const batch = await NaturePointBatchModel.create({
            userId,
            pointsEarned: pointsToEarn,
            remainingPoints: pointsToEarn,
            source: 'Purchase',
            sourceId,
            expiryDate
        });

        await NaturePointTransactionModel.create({
            userId,
            transactionType: 'Earned',
            points: pointsToEarn,
            source: `Order #${sourceId}`,
            batchRef: batch._id
        });

        return pointsToEarn;
    }

    async getAvailablePoints(userId: string) {
        const now = new Date();
        const batches = await NaturePointBatchModel.find({ 
            userId, 
            status: 'Active',
            expiryDate: { $gt: now }
        });
        return batches.reduce((sum, batch) => sum + batch.remainingPoints, 0);
    }

    async getDashboardInfo(userId: string) {
        const points = await this.getAvailablePoints(userId);
        
        const now = new Date();
        const nextExpiringBatch = await NaturePointBatchModel.findOne({
            userId,
            status: 'Active',
            expiryDate: { $gt: now }
        }).sort({ expiryDate: 1 });

        const transactions = await NaturePointTransactionModel.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        return {
            points,
            nextExpiringBatch,
            transactions
        };
    }

    async redeemPoints(userId: string, pointsToRedeem: number, orderId: string) {
        let remainingToRedeem = pointsToRedeem;
        const redeemedBatchesInfo: { batchId: mongoose.Types.ObjectId, pointsDeducted: number }[] = [];

        // FIFO: Oldest expiring active batch first
        const now = new Date();
        const batches = await NaturePointBatchModel.find({ 
            userId, 
            status: 'Active',
            expiryDate: { $gt: now }
        }).sort({ expiryDate: 1 });

        for (const batch of batches) {
            if (remainingToRedeem <= 0) break;

            const deduct = Math.min(batch.remainingPoints, remainingToRedeem);
            batch.remainingPoints -= deduct;
            remainingToRedeem -= deduct;

            if (batch.remainingPoints === 0) {
                batch.status = 'Depleted';
            }
            await batch.save();

            redeemedBatchesInfo.push({
                batchId: batch._id as mongoose.Types.ObjectId,
                pointsDeducted: deduct
            });
        }

        if (pointsToRedeem > 0) {
            await NaturePointTransactionModel.create({
                userId,
                transactionType: 'Redeemed',
                points: -pointsToRedeem,
                source: `Order #${orderId}`
            });
        }

        return redeemedBatchesInfo;
    }

    async reverseEarnedPoints(userId: string, sourceId: string) {
        const batch = await NaturePointBatchModel.findOne({ userId, sourceId, source: 'Purchase' });
        if (!batch) return;

        const pointsToReverse = batch.remainingPoints;
        batch.status = 'Depleted';
        batch.remainingPoints = 0;
        await batch.save();

        if (pointsToReverse > 0) {
            await NaturePointTransactionModel.create({
                userId,
                transactionType: 'Reversed',
                points: -pointsToReverse,
                source: `Refund for Order #${sourceId}`,
                batchRef: batch._id
            });
        }
    }

    async spinWheel(userId: string, pointsWon: number) {
        const settings = await LoyaltySettingModel.findOne();
        if (!settings || !settings.isLoyaltyEnabled) {
            throw new Error('Loyalty system is disabled');
        }

        if (pointsWon <= 0) {
            return 0; // Better luck next time
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + settings.pointValidityDays);

        const batch = await NaturePointBatchModel.create({
            userId,
            pointsEarned: pointsWon,
            remainingPoints: pointsWon,
            source: 'Wheel Reward',
            expiryDate
        });

        await NaturePointTransactionModel.create({
            userId,
            transactionType: 'Earned',
            points: pointsWon,
            source: 'Wheel Reward',
            batchRef: batch._id
        });

        return pointsWon;
    }
}
