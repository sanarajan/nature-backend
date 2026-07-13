import { inject, injectable } from 'tsyringe';
import {
    IAddCouponUseCase,
    IGetAllCouponsUseCase,
    IGetCouponByIdUseCase,
    IUpdateCouponUseCase,
    IDeleteCouponUseCase,
    IToggleCouponStatusUseCase
} from '../../interfaces/admin/IAdminCouponUseCases';
import { ICouponRepository } from '../../../domain/repositories/ICouponRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import cloudinary from '../../../infrastructure/config/cloudinary';

@injectable()
export class AddCouponUseCase implements IAddCouponUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(data: any): Promise<any> {
        const {
            couponName, couponImage, startDate, endDate, description,
            minPurchase, discountType, discountPercentage, discountValue,
            status, userUsageLimit
        } = data;

        if (!couponName || !startDate || !endDate || !description || !minPurchase || !discountType) {
            throw new ValidationError('Missing required fields');
        }

        const existingCoupon = await this.couponRepository.findByName(couponName.trim());
        if (existingCoupon) {
            throw new ValidationError('Coupon with this name already exists');
        }

        const uploadedImages: string[] = [];
        if (couponImage && Array.isArray(couponImage)) {
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    uploadedImages.push(uploadRes.secure_url);
                }
            }
        }

        const newCouponData = {
            couponName: couponName.trim(),
            couponImage: uploadedImages,
            startDate: new Date(startDate),
            endDate: (new Date(new Date(endDate).setHours(23, 59, 59, 999))),
            description: description.trim(),
            minPurchase: Number(minPurchase),
            discountType,
            discountPercentage: discountType === 'Percentage' ? Number(discountPercentage) : undefined,
            discountValue: discountType === 'Amount' ? Number(discountValue) : undefined,
            status: status === true || status === 'true',
            userUsageLimit: userUsageLimit ? Number(userUsageLimit) : undefined
        };

        return this.couponRepository.create(newCouponData);
    }
}

@injectable()
export class GetAllCouponsUseCase implements IGetAllCouponsUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(): Promise<any[]> {
        return this.couponRepository.findAll();
    }
}

@injectable()
export class GetCouponByIdUseCase implements IGetCouponByIdUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(id: string): Promise<any> {
        const coupon = await this.couponRepository.findById(id);
        if (!coupon) throw new NotFoundError('Coupon not found');
        return coupon;
    }
}

@injectable()
export class UpdateCouponUseCase implements IUpdateCouponUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(id: string, data: any): Promise<any> {
        const {
            couponName, couponImage, startDate, endDate, description,
            minPurchase, discountType, discountPercentage, discountValue,
            status, userUsageLimit
        } = data;

        const coupon = await this.couponRepository.findById(id);
        if (!coupon) throw new NotFoundError('Coupon not found');

        const existingCoupon = await this.couponRepository.findByNameExcludeId(couponName.trim(), id);
        if (existingCoupon) {
            throw new ValidationError('Another coupon with this name already exists');
        }

        coupon.couponName = couponName.trim();
        coupon.startDate = new Date(startDate);
        coupon.endDate = (new Date(new Date(endDate).setHours(23, 59, 59, 999)));
        coupon.description = description.trim();
        coupon.minPurchase = Number(minPurchase);
        coupon.discountType = discountType;
        coupon.discountPercentage = discountType === 'Percentage' ? Number(discountPercentage) : undefined;
        coupon.discountValue = discountType === 'Amount' ? Number(discountValue) : undefined;
        coupon.status = status === true || status === 'true';
        coupon.userUsageLimit = userUsageLimit ? Number(userUsageLimit) : undefined;

        if (couponImage && Array.isArray(couponImage)) {
            const updatedImages: string[] = [];
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    updatedImages.push(uploadRes.secure_url);
                } else if (img.startsWith('http')) {
                    updatedImages.push(img);
                }
            }
            coupon.couponImage = updatedImages;
        }

        return this.couponRepository.save(coupon);
    }
}

@injectable()
export class DeleteCouponUseCase implements IDeleteCouponUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(id: string): Promise<void> {
        const coupon = await this.couponRepository.deleteById(id);
        if (!coupon) throw new NotFoundError('Coupon not found');
    }
}

@injectable()
export class ToggleCouponStatusUseCase implements IToggleCouponStatusUseCase {
    constructor(@inject('ICouponRepository') private couponRepository: ICouponRepository) {}

    async execute(id: string): Promise<any> {
        const coupon = await this.couponRepository.findById(id);
        if (!coupon) throw new NotFoundError('Coupon not found');

        coupon.status = !coupon.status;
        return this.couponRepository.save(coupon);
    }
}
