import { inject, injectable } from 'tsyringe';
import { IGetActiveCouponsUseCase, IValidateCouponUseCase } from '../../interfaces/coupon/ICouponUseCases';
import { ICouponRepository } from '../../../domain/repositories/ICouponRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';

@injectable()
export class GetActiveCouponsUseCase implements IGetActiveCouponsUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(): Promise<any[]> {
        return this.couponRepository.findActiveCoupons(new Date());
    }
}

@injectable()
export class ValidateCouponUseCase implements IValidateCouponUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(code: string, purchaseAmount: number): Promise<any> {
        const coupon = await this.couponRepository.findActiveCouponByCode(code, new Date());

        if (!coupon) {
            throw new NotFoundError('Invalid or expired coupon');
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
