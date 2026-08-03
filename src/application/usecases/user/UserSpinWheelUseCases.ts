import { inject, injectable } from 'tsyringe';
import { ISpinWheelRepository } from '../../../domain/repositories/ISpinWheelRepository';
import { ICouponRepository } from '../../../domain/repositories/ICouponRepository';
import { CouponModel } from '../../../infrastructure/database/models/CouponModel';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class UserSpinWheelUseCases {
    constructor(
        @inject('ISpinWheelRepository') private spinWheelRepository: ISpinWheelRepository,
        @inject('ICouponRepository') private couponRepository: ICouponRepository
    ) {}

    async getStatus(userId?: string) {
        const settings = await this.spinWheelRepository.getSettings();
        const segments = await this.spinWheelRepository.getSegments(true);

        const now = new Date();
        const isCampaignActive = settings.isEnabled &&
            new Date(settings.startDate) <= now &&
            new Date(settings.endDate) >= now;

        const spinIntervalDays = (settings && settings.spinIntervalDays !== undefined && settings.spinIntervalDays !== null)
            ? Number(settings.spinIntervalDays)
            : 90;

        let canSpin = isCampaignActive;
        let remainingDays = 0;
        let lastSpinAt: Date | null = null;
        let nextSpinDate: Date | null = null;

        if (!userId) {
            canSpin = false;
        } else if (userId && isCampaignActive) {
            const lastSpin = await this.spinWheelRepository.getLastSpinForUser(userId);
            if (lastSpin) {
                lastSpinAt = lastSpin.spunAt;
                const lastTime = new Date(lastSpin.spunAt).getTime();

                const calcNextSpin = new Date(lastTime);
                calcNextSpin.setDate(calcNextSpin.getDate() + spinIntervalDays);
                nextSpinDate = calcNextSpin;

                const diffMs = now.getTime() - lastTime;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);

                if (diffDays < spinIntervalDays) {
                    canSpin = false;
                    remainingDays = Math.max(1, Math.ceil(spinIntervalDays - diffDays));
                }
            }
        }

        return {
            isCampaignActive,
            isEligible: canSpin,
            canSpin,
            daysRemaining: remainingDays,
            remainingDays,
            spinIntervalDays,
            nextSpinDate,
            lastSpinAt,
            showPopupAfterLogin: settings.showPopupAfterLogin,
            loggedInOnly: true,
            segments: segments.map((seg, idx) => ({
                id: seg._id,
                segmentName: seg.segmentName,
                displayText: seg.displayText,
                rewardType: seg.rewardType,
                rewardValue: seg.rewardValue,
                color: seg.color,
                order: seg.order || idx + 1
            }))
        };
    }

    async spin(userId: string) {
        if (!userId) {
            throw new AppError('User login required to spin the wheel', STATUS_CODES.UNAUTHORIZED);
        }

        const settings = await this.spinWheelRepository.getSettings();
        const now = new Date();

        if (!settings.isEnabled || new Date(settings.startDate) > now || new Date(settings.endDate) < now) {
            throw new AppError('Spin Wheel campaign is not active at this time', STATUS_CODES.BAD_REQUEST);
        }

        const spinIntervalDays = (settings && settings.spinIntervalDays !== undefined && settings.spinIntervalDays !== null)
            ? Number(settings.spinIntervalDays)
            : 90;

        const lastSpin = await this.spinWheelRepository.getLastSpinForUser(userId);
        if (lastSpin) {
            const lastTime = new Date(lastSpin.spunAt).getTime();
            const diffMs = now.getTime() - lastTime;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays < spinIntervalDays) {
                const remainingDays = Math.max(1, Math.ceil(spinIntervalDays - diffDays));
                throw new AppError(`You have already spun the wheel. You can spin again in ${remainingDays} day(s).`, STATUS_CODES.BAD_REQUEST);
            }
        }

        const activeSegments = await this.spinWheelRepository.getSegments(true);
        if (!activeSegments || activeSegments.length === 0) {
            throw new AppError('No active wheel segments found', STATUS_CODES.BAD_REQUEST);
        }

        // Weighted random selection based on segment probability
        const totalWeight = activeSegments.reduce((sum, seg) => sum + (seg.probability || 10), 0);
        let randomNum = Math.random() * totalWeight;

        let selectedSegment = activeSegments[0];
        for (const seg of activeSegments) {
            const weight = seg.probability || 10;
            if (randomNum < weight) {
                selectedSegment = seg;
                break;
            }
            randomNum -= weight;
        }

        const segmentIndex = activeSegments.findIndex(s => s._id.toString() === selectedSegment._id.toString());

        let generatedCoupon: any = null;

        if (selectedSegment.rewardType === 'Percentage Discount' || selectedSegment.rewardType === 'Fixed Amount Discount') {
            const randomCode = 'SPIN' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const validityDays = settings.couponValidityDays || 30;
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + validityDays);

            const isPercentage = selectedSegment.rewardType === 'Percentage Discount';

            generatedCoupon = await CouponModel.create({
                couponName: randomCode,
                description: `Spin Wheel Reward: ${selectedSegment.displayText}`,
                minPurchase: 0,
                discountType: isPercentage ? 'Percentage' : 'Amount',
                discountPercentage: isPercentage ? selectedSegment.rewardValue : undefined,
                discountValue: isPercentage ? undefined : selectedSegment.rewardValue,
                startDate: now,
                endDate: endDate,
                status: true,
                userUsageLimit: settings.maxCouponUsage || 1
            });
        }

        const spinRecord = await this.spinWheelRepository.recordSpin({
            user: userId,
            segment: selectedSegment._id,
            rewardType: selectedSegment.rewardType,
            rewardValue: selectedSegment.rewardValue,
            couponId: generatedCoupon ? generatedCoupon._id : null,
            couponCode: generatedCoupon ? generatedCoupon.couponName : '',
            spunAt: now
        });

        const nextSpinDate = new Date(now.getTime());
        nextSpinDate.setDate(nextSpinDate.getDate() + spinIntervalDays);

        return {
            spinId: spinRecord._id,
            canSpin: false,
            remainingDays: spinIntervalDays,
            daysRemaining: spinIntervalDays,
            spinIntervalDays,
            nextSpinDate,
            winningSegment: {
                id: selectedSegment._id,
                index: segmentIndex,
                segmentName: selectedSegment.segmentName,
                displayText: selectedSegment.displayText,
                rewardType: selectedSegment.rewardType,
                rewardValue: selectedSegment.rewardValue,
                color: selectedSegment.color
            },
            coupon: generatedCoupon ? {
                code: generatedCoupon.couponName,
                expiryDate: generatedCoupon.endDate,
                discountType: generatedCoupon.discountType,
                discountValue: isNaN(generatedCoupon.discountValue) ? generatedCoupon.discountPercentage + '%' : '₹' + generatedCoupon.discountValue
            } : null
        };
    }

    async getMyRewards(userId: string) {
        if (!userId) {
            throw new AppError('User login required', STATUS_CODES.UNAUTHORIZED);
        }

        const history = await this.spinWheelRepository.getUserSpinHistory(userId);
        const now = new Date();

        return history.map(item => {
            const coupon = item.couponId as any;
            let status = 'No Reward';

            if (coupon) {
                if (new Date(coupon.endDate) < now) {
                    status = 'Expired';
                } else if (!coupon.status) {
                    status = 'Used';
                } else {
                    status = 'Active';
                }
            } else if (item.rewardType !== 'Better Luck Next Time') {
                status = 'Active';
            }

            return {
                id: item._id,
                rewardName: item.segment?.segmentName || item.rewardType,
                displayText: item.segment?.displayText || item.rewardType,
                rewardType: item.rewardType,
                rewardValue: item.rewardValue,
                couponCode: item.couponCode || '',
                expiryDate: coupon?.endDate || null,
                status,
                spunAt: item.spunAt
            };
        });
    }
}
