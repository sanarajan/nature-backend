import { inject, injectable } from 'tsyringe';
import mongoose from 'mongoose';
import {
    IToggleWishlistUseCase,
    IGetWishlistUseCase,
    ISyncWishlistUseCase
} from '../../interfaces/user/IWishlistUseCases';
import { IWishlistRepository } from '../../../domain/repositories/ICartRepository';
import { WishlistModel } from '../../../infrastructure/database/models/WishlistModel';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';

@injectable()
export class ToggleWishlistUseCase implements IToggleWishlistUseCase {
    constructor(@inject('IWishlistRepository') private wishlistRepository: IWishlistRepository) {}

    async execute(userId: string, productId: string): Promise<{ action: string }> {
        if (!productId) throw new ValidationError('Product ID is required');

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            throw new ValidationError('Invalid User or Product ID');
        }

        const existingItem = await this.wishlistRepository.findItem(userId, productId);

        if (existingItem) {
            await this.wishlistRepository.deleteItem(existingItem._id.toString());
            return { action: 'removed' };
        } else {
            const newItem = new WishlistModel({
                user: new mongoose.Types.ObjectId(userId),
                products: new mongoose.Types.ObjectId(productId)
            });
            await this.wishlistRepository.save(newItem);
            return { action: 'added' };
        }
    }
}

@injectable()
export class GetWishlistUseCase implements IGetWishlistUseCase {
    constructor(@inject('IWishlistRepository') private wishlistRepository: IWishlistRepository) {}

    async execute(userId: string): Promise<any[]> {
        const wishlist = await this.wishlistRepository.findByUserId(userId);
        // Flatten the response to return an array of products
        return wishlist.map((item: any) => item.products);
    }
}

@injectable()
export class SyncWishlistUseCase implements ISyncWishlistUseCase {
    constructor(@inject('IWishlistRepository') private wishlistRepository: IWishlistRepository) {}

    async execute(userId: string, productIds: string[]): Promise<void> {
        if (!productIds || !Array.isArray(productIds)) {
            throw new ValidationError('productIds array is required');
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        for (const pid of productIds) {
            if (mongoose.Types.ObjectId.isValid(pid)) {
                const existingItem = await this.wishlistRepository.findItem(userId, pid);
                if (!existingItem) {
                    const newItem = new WishlistModel({
                        user: userObjectId,
                        products: new mongoose.Types.ObjectId(pid)
                    });
                    await this.wishlistRepository.save(newItem);
                }
            }
        }
    }
}
