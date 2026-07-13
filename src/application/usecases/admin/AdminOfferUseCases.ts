import { inject, injectable } from 'tsyringe';
import { IOfferRepository } from '../../../domain/repositories/IOfferRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import mongoose from 'mongoose';

@injectable()
export class AddOfferUseCase {
    constructor(
        @inject('IOfferRepository') private offerRepository: IOfferRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    private extractId(item: any): string | null {
        if (!item) return null;
        if (typeof item === 'string' && mongoose.isValidObjectId(item)) return item;
        if (mongoose.isValidObjectId(item) && item.toString) return item.toString();
        if (typeof item === 'object') {
            const inner = item.productId || item.product || item._id || item.id;
            if (inner) {
                if (typeof inner === 'object') return this.extractId(inner);
                if (typeof inner === 'string' && mongoose.isValidObjectId(inner)) return inner;
            }
        }
        return null;
    }

    async execute(data: any) {
        const cleanProductId = this.extractId(data.productId);
        const cleanCategoryId = this.extractId(data.categoryId);

        if (data.offerFor === 'product' && cleanProductId) {
            const product = await this.productRepository.findById(cleanProductId);
            if (product) {
                if (data.discountType === 'amount' && data.discountValue >= product.price) {
                    throw new AppError('Discount amount must be less than product price', STATUS_CODES.BAD_REQUEST);
                }
                if (data.discountType === 'percentage' && data.discountValue >= 100) {
                    throw new AppError('Discount percentage must be less than 100%', STATUS_CODES.BAD_REQUEST);
                }
            }
        }

        const newOfferData = {
            offerName: data.offerName,
            offerFor: data.offerFor,
            productId: cleanProductId ? new mongoose.Types.ObjectId(cleanProductId) : undefined,
            categoryId: cleanCategoryId ? new mongoose.Types.ObjectId(cleanCategoryId) : undefined,
            discountType: data.discountType,
            discountValue: data.discountValue,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status !== undefined ? data.status : true
        };

        return await this.offerRepository.createOffer(newOfferData);
    }
}

@injectable()
export class GetAllOffersUseCase {
    constructor(
        @inject('IOfferRepository') private offerRepository: IOfferRepository
    ) {}

    async execute() {
        return await this.offerRepository.findAllOffers();
    }
}

@injectable()
export class UpdateOfferUseCase {
    constructor(
        @inject('IOfferRepository') private offerRepository: IOfferRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    private extractId(item: any): string | null {
        if (!item) return null;
        if (typeof item === 'string' && mongoose.isValidObjectId(item)) return item;
        if (mongoose.isValidObjectId(item) && item.toString) return item.toString();
        if (typeof item === 'object') {
            const inner = item.productId || item.product || item._id || item.id;
            if (inner) {
                if (typeof inner === 'object') return this.extractId(inner);
                if (typeof inner === 'string' && mongoose.isValidObjectId(inner)) return inner;
            }
        }
        return null;
    }

    async execute(id: string, data: any) {
        const cleanProductId = this.extractId(data.productId);
        const cleanCategoryId = this.extractId(data.categoryId);

        if (data.offerFor === 'product' && cleanProductId && data.discountValue) {
            const product = await this.productRepository.findById(cleanProductId);
            if (product) {
                if (data.discountType === 'amount' && data.discountValue >= product.price) {
                    throw new AppError('Discount amount must be less than product price', STATUS_CODES.BAD_REQUEST);
                }
                if (data.discountType === 'percentage' && data.discountValue >= 100) {
                    throw new AppError('Discount percentage must be less than 100%', STATUS_CODES.BAD_REQUEST);
                }
            }
        }

        const updateData = { ...data };
        if (updateData.productId) updateData.productId = cleanProductId ? new mongoose.Types.ObjectId(cleanProductId) : undefined;
        if (updateData.categoryId) updateData.categoryId = cleanCategoryId ? new mongoose.Types.ObjectId(cleanCategoryId) : undefined;

        const updatedOffer = await this.offerRepository.updateOffer(id, updateData);
        if (!updatedOffer) {
            throw new AppError('Offer not found', STATUS_CODES.NOT_FOUND);
        }

        return updatedOffer;
    }
}

@injectable()
export class DeleteOfferUseCase {
    constructor(
        @inject('IOfferRepository') private offerRepository: IOfferRepository
    ) {}

    async execute(id: string) {
        const offer = await this.offerRepository.findOfferById(id);
        if (!offer) {
            throw new AppError('Offer not found', STATUS_CODES.NOT_FOUND);
        }
        await this.offerRepository.deleteOffer(id);
    }
}

@injectable()
export class ToggleOfferStatusUseCase {
    constructor(
        @inject('IOfferRepository') private offerRepository: IOfferRepository
    ) {}

    async execute(id: string) {
        const offer = await this.offerRepository.findOfferById(id);
        if (!offer) {
            throw new AppError('Offer not found', STATUS_CODES.NOT_FOUND);
        }
        return await this.offerRepository.toggleOfferStatus(id);
    }
}
