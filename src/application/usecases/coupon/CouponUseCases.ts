import { inject, injectable } from 'tsyringe';
import { IGetActiveCouponsUseCase, IValidateCouponUseCase } from '../../interfaces/coupon/ICouponUseCases';
import { ICouponRepository } from '../../../domain/repositories/ICouponRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import { SpinHistoryModel } from '../../../infrastructure/database/models/SpinHistoryModel';
import { OrderModel } from '../../../infrastructure/database/models/OrderModel';

@injectable()
export class GetActiveCouponsUseCase implements IGetActiveCouponsUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(userId?: string): Promise<any[]> {
        const coupons = await this.couponRepository.findActiveCoupons(new Date());
        
        if (!userId) {
            return coupons;
        }

        // Get all successful redemptions for this user
        const previousUsages = await OrderModel.find({
            userId: userId,
            coupon: { $ne: null },
            globalOrderStatus: { $nin: ['PENDING', 'Expired', 'Failed', 'CANCELLED', 'CANCELLATION_REQUEST', 'Cancelled'] }
        }).select('coupon').lean();

        const usedCouponIds = new Set(previousUsages.map((usage: any) => usage.coupon?.toString()));

        // Filter out coupons that the user has already used
        return coupons.filter(coupon => !usedCouponIds.has(coupon._id?.toString()));
    }
}

@injectable()
export class ValidateCouponUseCase implements IValidateCouponUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(code: string, purchaseAmount: number, userId: string): Promise<any> {
        // FIRST: Check if this is a Spin Wheel reward
        let isWheelCoupon = false;
        let userCouponId = null;

        if (code.toUpperCase().startsWith('SPIN')) {
            const anySpinHistory = await SpinHistoryModel.findOne({ 
                couponCode: { $regex: new RegExp(`^${code}$`, 'i') } 
            });
            
            if (anySpinHistory) {
                isWheelCoupon = true;
                const userSpinHistory = await SpinHistoryModel.findOne({
                    couponCode: { $regex: new RegExp(`^${code}$`, 'i') },
                    user: userId
                });

                if (!userSpinHistory) {
                    throw new ValidationError('Invalid coupon code');
                }
                userCouponId = userSpinHistory.couponId;
            }
        }

        let coupon = null;
        if (isWheelCoupon && userCouponId) {
            const fetchedCoupon = await this.couponRepository.findById(userCouponId.toString());
            const now = new Date();
            if (fetchedCoupon && fetchedCoupon.status && new Date(fetchedCoupon.startDate) <= now && new Date(fetchedCoupon.endDate) >= now) {
                coupon = fetchedCoupon;
            }
        } else {
            coupon = await this.couponRepository.findActiveCouponByCode(code, new Date());
        }

        if (!coupon) {
            let existingCoupon = null;
            if (isWheelCoupon && userCouponId) {
                existingCoupon = await this.couponRepository.findById(userCouponId.toString());
            } else {
                existingCoupon = await this.couponRepository.findByName(code);
            }

            if (existingCoupon) {
                if (!existingCoupon.status) {
                    throw new ValidationError('Coupon already used');
                } else {
                    throw new ValidationError('Coupon has expired');
                }
            }
            throw new NotFoundError('Invalid coupon code');
        }

        // Check if the customer has already successfully used this normal coupon
        if (!isWheelCoupon) {
            const previousUsage = await OrderModel.findOne({
                userId: userId,
                coupon: coupon._id,
                globalOrderStatus: { $nin: ['PENDING', 'Expired', 'Failed', 'CANCELLED', 'CANCELLATION_REQUEST', 'Cancelled'] }
            });

            if (previousUsage) {
                throw new ValidationError('Coupon already used');
            }
        }

        if (purchaseAmount < coupon.minPurchase) {
            throw new ValidationError(`Minimum purchase of ₹${coupon.minPurchase} required.`);
        }

        let discount = 0;
        if (coupon.discountType === 'Percentage') {
            discount = (purchaseAmount * (coupon.discountPercentage || 0)) / 100;
        } else {
            discount = coupon.discountValue || 0;
        }

        return {
            _id: coupon._id,
            couponName: coupon.couponName,
            discountType: coupon.discountType,
            discountValue: discount,
            minPurchase: coupon.minPurchase
        };
    }
}
