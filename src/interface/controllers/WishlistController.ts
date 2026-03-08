import { Request, Response } from 'express';
import { WishlistModel } from '../../infrastructure/database/models/WishlistModel';
import mongoose from 'mongoose';

export const toggleWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId } = req.body;

        console.log('Toggle Wishlist Request:', { userId, productId });

        if (!productId) {
            console.log('Wishlist toggle failed: Product ID missing');
            res.status(400).json({ success: false, message: 'Product ID is required' });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            console.log('Wishlist toggle failed: Invalid IDs', { userId, productId });
            res.status(400).json({ success: false, message: 'Invalid User or Product ID' });
            return;
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const productObjectId = new mongoose.Types.ObjectId(productId);

        const existingItem = await WishlistModel.findOne({ user: userObjectId, products: productObjectId });

        if (existingItem) {
            await WishlistModel.deleteOne({ _id: existingItem._id });
            res.status(200).json({ success: true, message: 'Removed from wishlist', action: 'removed' });
        } else {
            const newItem = new WishlistModel({
                user: userObjectId,
                products: productObjectId
            });
            await newItem.save();
            res.status(201).json({ success: true, message: 'Added to wishlist', action: 'added' });
        }
    } catch (error: any) {
        console.error('Wishlist toggle error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error toggling wishlist' });
    }
};

export const getWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const wishlist = await WishlistModel.find({ user: userId })
            .populate({
                path: 'products',
                populate: [
                    { path: 'categoryId', select: 'categoryName' },
                    { path: 'subcategoryId', select: 'subcategoryName' }
                ]
            });

        // Flatten the response to return an array of products
        const products = wishlist.map(item => item.products);

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching wishlist' });
    }
};

export const syncWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productIds } = req.body; // Array of product ids

        if (!productIds || !Array.isArray(productIds)) {
            res.status(400).json({ success: false, message: 'productIds array is required' });
            return;
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        for (const pid of productIds) {
            if (mongoose.Types.ObjectId.isValid(pid)) {
                const productObjectId = new mongoose.Types.ObjectId(pid);
                const exists = await WishlistModel.findOne({ user: userObjectId, products: productObjectId });
                if (!exists) {
                    await new WishlistModel({ user: userObjectId, products: productObjectId }).save();
                }
            }
        }

        res.status(200).json({ success: true, message: 'Wishlist synced' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error syncing wishlist' });
    }
};
