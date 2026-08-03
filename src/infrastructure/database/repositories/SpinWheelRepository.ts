import { injectable } from 'tsyringe';
import { ISpinWheelRepository } from '../../../domain/repositories/ISpinWheelRepository';
import { SpinWheelSettingModel } from '../models/SpinWheelSettingModel';
import { SpinWheelSegmentModel } from '../models/SpinWheelSegmentModel';
import { SpinHistoryModel } from '../models/SpinHistoryModel';
import { CouponModel } from '../models/CouponModel';
import { OrderModel } from '../models/OrderModel';

@injectable()
export class SpinWheelRepository implements ISpinWheelRepository {
    async getSettings(): Promise<any> {
        let settings = await SpinWheelSettingModel.findOne();
        if (!settings) {
            const now = new Date();
            const nextYear = new Date();
            nextYear.setFullYear(now.getFullYear() + 1);

            settings = await SpinWheelSettingModel.create({
                isEnabled: true,
                startDate: now,
                endDate: nextYear,
                spinIntervalDays: 90,
                couponValidityDays: 30,
                maxCouponUsage: 1,
                showPopupAfterLogin: true,
                loggedInOnly: true
            });
        }
        return settings;
    }

    async updateSettings(data: any): Promise<any> {
        let settings = await SpinWheelSettingModel.findOne();
        if (!settings) {
            settings = new SpinWheelSettingModel(data);
        } else {
            Object.assign(settings, data);
        }
        return await settings.save();
    }

    async getSegments(onlyActive = false): Promise<any[]> {
        const query = onlyActive ? { isActive: true } : {};
        let segments = await SpinWheelSegmentModel.find(query).sort({ order: 1, createdAt: 1 });

        if (segments.length === 0 && !onlyActive) {
            // Seed default dynamic segments
            const defaults = [
                { segmentName: '10% OFF', rewardType: 'Percentage Discount' as const, rewardValue: 10, displayText: 'Get 10% OFF on your next order!', probability: 25, color: '#0D775E', isActive: true, order: 1 },
                { segmentName: '₹50 OFF', rewardType: 'Fixed Amount Discount' as const, rewardValue: 50, displayText: 'Get ₹50 OFF on your next order!', probability: 20, color: '#E0A96D', isActive: true, order: 2 },
                { segmentName: 'Better Luck Next Time', rewardType: 'Better Luck Next Time' as const, rewardValue: 0, displayText: 'Better luck next time!', probability: 30, color: '#334155', isActive: true, order: 3 },
                { segmentName: '20% OFF', rewardType: 'Percentage Discount' as const, rewardValue: 20, displayText: 'Huge 20% discount just for you!', probability: 10, color: '#0D775E', isActive: true, order: 4 },
                { segmentName: '₹100 OFF', rewardType: 'Fixed Amount Discount' as const, rewardValue: 100, displayText: 'Get ₹100 OFF on your next order!', probability: 5, color: '#E0A96D', isActive: true, order: 5 },
                { segmentName: 'Try Again Next Time', rewardType: 'Better Luck Next Time' as const, rewardValue: 0, displayText: 'Better luck next time!', probability: 30, color: '#334155', isActive: true, order: 6 }
            ];

            segments = await SpinWheelSegmentModel.insertMany(defaults) as any;
        }


        return segments;
    }

    async getSegmentById(id: string): Promise<any | null> {
        return await SpinWheelSegmentModel.findById(id);
    }

    async createSegment(data: any): Promise<any> {
        const count = await SpinWheelSegmentModel.countDocuments();
        if (data.order === undefined) {
            data.order = count + 1;
        }
        return await SpinWheelSegmentModel.create(data);
    }

    async updateSegment(id: string, data: any): Promise<any | null> {
        return await SpinWheelSegmentModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteSegment(id: string): Promise<any | null> {
        return await SpinWheelSegmentModel.findByIdAndDelete(id);
    }

    async reorderSegments(orders: { id: string; order: number }[]): Promise<boolean> {
        const ops = orders.map(item => ({
            updateOne: {
                filter: { _id: item.id },
                update: { order: item.order }
            }
        }));
        await SpinWheelSegmentModel.bulkWrite(ops);
        return true;
    }

    async getLastSpinForUser(userId: string): Promise<any | null> {
        return await SpinHistoryModel.findOne({ user: userId }).sort({ spunAt: -1 });
    }

    async recordSpin(data: any): Promise<any> {
        return await SpinHistoryModel.create(data);
    }

    async getUserSpinHistory(userId: string): Promise<any[]> {
        return await SpinHistoryModel.find({ user: userId })
            .populate('segment')
            .populate('couponId')
            .sort({ spunAt: -1 });
    }

    async getReportStats(): Promise<{
        totalSpins: number;
        todaySpins: number;
        couponsGenerated: number;
        couponsRedeemed: number;
        couponsExpired: number;
        mostWonReward: string;
    }> {
        const totalSpins = await SpinHistoryModel.countDocuments();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todaySpins = await SpinHistoryModel.countDocuments({ spunAt: { $gte: todayStart } });

        const spinHistoriesWithCoupons = await SpinHistoryModel.find({ couponId: { $ne: null } });
        const couponsGenerated = spinHistoriesWithCoupons.length;

        const couponIds = spinHistoriesWithCoupons.map(sh => sh.couponId).filter(Boolean);

        const now = new Date();
        const coupons = await CouponModel.find({ _id: { $in: couponIds } });

        let couponsExpired = 0;

        coupons.forEach(c => {
            if (c.endDate < now) {
                couponsExpired++;
            }
        });

        // Count redeemed coupons in Orders
        const couponsRedeemed = await OrderModel.countDocuments({
            couponId: { $in: couponIds },
            globalOrderStatus: { $nin: ['CANCELLED', 'Cancelled', 'Expired'] }
        });

        // Most won reward
        const aggregation = await SpinHistoryModel.aggregate([
            { $group: { _id: '$rewardType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        const mostWonReward = aggregation.length > 0 ? `${aggregation[0]._id} (${aggregation[0].count})` : 'N/A';

        return {
            totalSpins,
            todaySpins,
            couponsGenerated,
            couponsRedeemed,
            couponsExpired,
            mostWonReward
        };
    }
}
