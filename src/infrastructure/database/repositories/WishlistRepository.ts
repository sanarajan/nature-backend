import { injectable } from 'tsyringe';
import { IWishlistRepository } from '../../../domain/repositories/ICartRepository';
import { WishlistModel } from '../models/WishlistModel';
import mongoose from 'mongoose';

@injectable()
export class WishlistRepository implements IWishlistRepository {
    async findByUserId(userId: string): Promise<any | null> {
        return WishlistModel.find({ user: userId })
            .populate({
                path: 'products',
                populate: [
                    { path: 'categoryId', select: 'categoryName' },
                    { path: 'subcategoryId', select: 'subcategoryName' }
                ]
            })
            .exec();
    }

    async findItem(userId: string, productId: string): Promise<any> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const productObjectId = new mongoose.Types.ObjectId(productId);
        return WishlistModel.findOne({ user: userObjectId, products: productObjectId }).exec();
    }

    async createWishlist(userId: string): Promise<any> {
        // Legacy: Wishlist is currently stored as multiple documents per user/product pair.
        // We will just return empty array here to match findByUserId type (array)
        return [];
    }

    async save(wishlist: any): Promise<any> {
        // Used for saving a single new item in legacy structure
        return wishlist.save();
    }

    async deleteItem(id: string): Promise<void> {
        await WishlistModel.deleteOne({ _id: id });
    }
}
