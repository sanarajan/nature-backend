"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncWishlist = exports.getWishlist = exports.toggleWishlist = void 0;
const WishlistModel_1 = require("../../infrastructure/database/models/WishlistModel");
const mongoose_1 = __importDefault(require("mongoose"));
const toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        console.log('Toggle Wishlist Request:', { userId, productId });
        if (!productId) {
            console.log('Wishlist toggle failed: Product ID missing');
            res.status(400).json({ success: false, message: 'Product ID is required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
            console.log('Wishlist toggle failed: Invalid IDs', { userId, productId });
            res.status(400).json({ success: false, message: 'Invalid User or Product ID' });
            return;
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const productObjectId = new mongoose_1.default.Types.ObjectId(productId);
        const existingItem = await WishlistModel_1.WishlistModel.findOne({ user: userObjectId, products: productObjectId });
        if (existingItem) {
            await WishlistModel_1.WishlistModel.deleteOne({ _id: existingItem._id });
            res.status(200).json({ success: true, message: 'Removed from wishlist', action: 'removed' });
        }
        else {
            const newItem = new WishlistModel_1.WishlistModel({
                user: userObjectId,
                products: productObjectId
            });
            await newItem.save();
            res.status(201).json({ success: true, message: 'Added to wishlist', action: 'added' });
        }
    }
    catch (error) {
        console.error('Wishlist toggle error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error toggling wishlist' });
    }
};
exports.toggleWishlist = toggleWishlist;
const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const wishlist = await WishlistModel_1.WishlistModel.find({ user: userId })
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching wishlist' });
    }
};
exports.getWishlist = getWishlist;
const syncWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productIds } = req.body; // Array of product ids
        if (!productIds || !Array.isArray(productIds)) {
            res.status(400).json({ success: false, message: 'productIds array is required' });
            return;
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        for (const pid of productIds) {
            if (mongoose_1.default.Types.ObjectId.isValid(pid)) {
                const productObjectId = new mongoose_1.default.Types.ObjectId(pid);
                const exists = await WishlistModel_1.WishlistModel.findOne({ user: userObjectId, products: productObjectId });
                if (!exists) {
                    await new WishlistModel_1.WishlistModel({ user: userObjectId, products: productObjectId }).save();
                }
            }
        }
        res.status(200).json({ success: true, message: 'Wishlist synced' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error syncing wishlist' });
    }
};
exports.syncWishlist = syncWishlist;
