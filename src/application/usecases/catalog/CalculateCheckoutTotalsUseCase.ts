import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { CartModel } from '../../../infrastructure/database/models/CartModel';
import { SharedPricingService } from '../../services/SharedPricingService';

@injectable()
export class CalculateCheckoutTotalsUseCase {
    constructor(
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, data: any, cookies: any) {
        const { addressId, referralCode, couponCode, useNaturePoints } = data;
        const influencerRef = cookies?.influencer_ref || data.influencerRef;

        const cart = await CartModel.findOne({ user: userId, isActive: true })
            .populate({
                path: 'products.product',
                populate: [
                    { path: 'categoryId', select: 'categoryName _id' },
                    { path: 'subcategoryId', select: 'subcategoryName _id' }
                ]
            });

        if (!cart || cart.products.length === 0) {
            throw new AppError('Cart is empty', STATUS_CODES.BAD_REQUEST);
        }

        const calculated = await this.sharedPricingService.calculate(cart, {
            userId,
            influencerRef,
            couponCode,
            referralCode,
            addressId,
            useNaturePoints
        });

        // CalculateCheckoutTotals expects pricing at the top level
        return {
            originalPrice: calculated.pricing.originalPrice,
            deliveryCharge: calculated.pricing.deliveryCharge,
            totalDiscount: calculated.pricing.totalDiscount,
            influencerDiscountAmount: calculated.pricing.influencerDiscountAmount,
            finalPrice: calculated.pricing.finalPrice,
            appliedDiscounts: calculated.appliedDiscounts,
            influencerDiscount: calculated.influencerDiscount,
            influencerApplied: calculated.influencerApplied,
            discountType: calculated.discountType,
            total: calculated.total,
            subtotal: calculated.subtotal,
            naturePointsDiscount: calculated.pricing.naturePointsDiscount,
            naturePointsUsed: calculated.pricing.naturePointsUsed
        };
    }
}
