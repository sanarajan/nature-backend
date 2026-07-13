import { inject, injectable } from 'tsyringe';
import { IComboOfferRepository } from '../../../domain/repositories/IComboOfferRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import mongoose from 'mongoose';
import cloudinary from '../../../infrastructure/config/cloudinary';

@injectable()
export class AddComboOfferUseCase {
    constructor(
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository,
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
        if (!data.products || !Array.isArray(data.products) || data.products.length < 1) {
            throw new AppError('Combo must include at least 1 product', STATUS_CODES.BAD_REQUEST);
        }

        const collapsedMap = new Map<string, number>();
        data.products.forEach((p: any) => {
            const id = this.extractId(p);
            const qty = Number(p.requiredQuantity || p.quantity) || 1;
            if (id) {
                collapsedMap.set(id, (collapsedMap.get(id) || 0) + qty);
            }
        });

        const cleanedItems: {id: string, requiredQuantity: number}[] = [];
        collapsedMap.forEach((qty, id) => {
            cleanedItems.push({ id, requiredQuantity: qty });
        });

        if (cleanedItems.length === 0) {
            throw new AppError('No valid products identified in the request', STATUS_CODES.BAD_REQUEST);
        }

        const isValidCombo = cleanedItems.length > 1 || cleanedItems.some(p => p.requiredQuantity > 1);
        if (!isValidCombo) {
            throw new AppError('Combo must contain multiple products or at least one product with quantity greater than 1', STATUS_CODES.BAD_REQUEST);
        }

        const productIds = cleanedItems.map(i => i.id as string);
        const finalQueryIds = productIds.filter(id => mongoose.isValidObjectId(id));
        const productDocs = await this.productRepository.findProductsByIds(finalQueryIds);
        
        let totalSum = 0;
        cleanedItems.forEach(item => {
            const doc = productDocs.find(d => d._id.toString() === item.id);
            if (doc) {
                totalSum += (doc.price || 0) * item.requiredQuantity;
            }
        });

        if (data.discountType === 'amount' && Number(data.discountValue) >= totalSum) {
            throw new AppError(`Discount amount (₹${data.discountValue}) must be less than total sum (₹${totalSum})`, STATUS_CODES.BAD_REQUEST);
        } else if (data.discountType === 'percentage' && Number(data.discountValue) >= 100) {
            throw new AppError('Discount percentage must be less than 100%', STATUS_CODES.BAD_REQUEST);
        }

        let finalImageUrl: string | undefined = undefined;
        const b64Data = data.image || data.imageUrl;
        
        if (b64Data && typeof b64Data === 'string' && b64Data.startsWith('data:image')) {
            try {
                const uploadRes = await cloudinary.uploader.upload(b64Data, {
                    folder: 'natural_ayam/combo_offers',
                });
                finalImageUrl = uploadRes.secure_url;
            } catch (uploadErr) {
                throw new AppError('Image upload to Cloudinary failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        const newComboOfferData = {
            offerName: data.offerName,
            products: cleanedItems.map(item => ({
                productId: new mongoose.Types.ObjectId(item.id!),
                requiredQuantity: item.requiredQuantity
            })),
            discountType: data.discountType || 'amount',
            discountValue: data.discountValue,
            maxUsagePerOrder: data.maxUsagePerOrder || 0,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status !== undefined ? data.status : true,
            imageUrl: finalImageUrl
        };

        return await this.comboOfferRepository.createComboOffer(newComboOfferData);
    }
}

@injectable()
export class GetAllComboOffersUseCase {
    constructor(
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository
    ) {}

    async execute() {
        return await this.comboOfferRepository.findAllComboOffers();
    }
}

@injectable()
export class UpdateComboOfferUseCase {
    constructor(
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository,
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
        const existing = await this.comboOfferRepository.findComboOfferById(id);
        if (!existing) {
            throw new AppError('Combo Offer not found', STATUS_CODES.NOT_FOUND);
        }

        let cleanedItems: {id: string, requiredQuantity: number}[] = [];
        if (data.products) {
            const collapsedMap = new Map<string, number>();
            data.products.forEach((p: any) => {
                const pid = this.extractId(p);
                const qty = Number(p.requiredQuantity || p.quantity) || 1;
                if (pid) {
                    collapsedMap.set(pid, (collapsedMap.get(pid) || 0) + qty);
                }
            });
            collapsedMap.forEach((qty, pid) => {
                cleanedItems.push({ id: pid, requiredQuantity: qty });
            });
        }

        let updateData = { ...data };

        const b64Update = data.image || data.imageUrl;
        if (b64Update && typeof b64Update === 'string') {
            if (b64Update.startsWith('data:image')) {
                const uploadRes = await cloudinary.uploader.upload(b64Update, {
                    folder: 'natural_ayam/combo_offers',
                });
                updateData.imageUrl = uploadRes.secure_url;
            } else if (b64Update.startsWith('http')) {
                updateData.imageUrl = b64Update;
            }
        } else if (b64Update === '') {
            updateData.imageUrl = undefined;
        }

        if (data.products && cleanedItems.length > 0) {
            updateData.products = cleanedItems.map(item => ({
                productId: new mongoose.Types.ObjectId(item.id!),
                requiredQuantity: item.requiredQuantity
            }));
        }

        const updatedOffer = await this.comboOfferRepository.updateComboOffer(id, updateData);
        if (!updatedOffer) {
            throw new AppError('Combo Offer not found', STATUS_CODES.NOT_FOUND);
        }

        return updatedOffer;
    }
}

@injectable()
export class DeleteComboOfferUseCase {
    constructor(
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository
    ) {}

    async execute(id: string) {
        const offer = await this.comboOfferRepository.findComboOfferById(id);
        if (!offer) {
            throw new AppError('Combo Offer not found', STATUS_CODES.NOT_FOUND);
        }
        await this.comboOfferRepository.deleteComboOffer(id);
    }
}

@injectable()
export class ToggleComboOfferStatusUseCase {
    constructor(
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository
    ) {}

    async execute(id: string) {
        const offer = await this.comboOfferRepository.findComboOfferById(id);
        if (!offer) {
            throw new AppError('Combo Offer not found', STATUS_CODES.NOT_FOUND);
        }
        return await this.comboOfferRepository.toggleComboOfferStatus(id);
    }
}
