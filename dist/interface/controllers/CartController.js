"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOfflineCart = exports.removeCartItem = exports.updateCartItemQuantity = exports.toggleCartItem = exports.getCart = void 0;
const CartModel_1 = require("../../infrastructure/database/models/CartModel");
const mongoose_1 = __importDefault(require("mongoose"));
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        let cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true })
            .populate('products.product');
        if (!cart) {
            cart = await CartModel_1.CartModel.create({ user: userId, products: [], isActive: true });
        }
        res.status(200).json({ success: true, data: cart });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching cart' });
    }
};
exports.getCart = getCart;
const toggleCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }
        let cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true });
        if (!cart) {
            cart = new CartModel_1.CartModel({ user: userId, products: [], isActive: true });
        }
        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
        if (productIndex > -1) {
            // If exists, increment quantity (or just rely on the requested quantity)
            cart.products[productIndex].quantity += quantity;
        }
        else {
            // Add new product
            cart.products.push({ product: new mongoose_1.default.Types.ObjectId(productId), quantity });
        }
        await cart.save();
        await cart.populate('products.product');
        res.status(200).json({ success: true, message: 'Cart updated', data: cart });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error updating cart' });
    }
};
exports.toggleCartItem = toggleCartItem;
const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;
        if (!productId || quantity === undefined || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid product details' });
        }
        const cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true });
        if (!cart)
            return res.status(404).json({ success: false, message: 'Cart not found' });
        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
        if (productIndex > -1) {
            cart.products[productIndex].quantity = quantity;
            await cart.save();
            await cart.populate('products.product');
            res.status(200).json({ success: true, message: 'Quantity updated', data: cart });
        }
        else {
            res.status(404).json({ success: false, message: 'Product not in cart' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error updating item quantity' });
    }
};
exports.updateCartItemQuantity = updateCartItemQuantity;
const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true });
        if (!cart)
            return res.status(404).json({ success: false, message: 'Cart not found' });
        cart.products = cart.products.filter(p => p.product.toString() !== productId);
        await cart.save();
        await cart.populate('products.product');
        res.status(200).json({ success: true, message: 'Product removed from cart', data: cart });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error removing item from cart' });
    }
};
exports.removeCartItem = removeCartItem;
const syncOfflineCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cartItems } = req.body; // Array of { product: productId, quantity }
        if (!cartItems || !Array.isArray(cartItems)) {
            return res.status(400).json({ success: false, message: 'Invalid cart items format' });
        }
        let cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true });
        if (!cart) {
            cart = new CartModel_1.CartModel({ user: userId, products: [], isActive: true });
        }
        for (const item of cartItems) {
            const index = cart.products.findIndex(p => p.product.toString() === item.product);
            if (index > -1) {
                cart.products[index].quantity += (item.quantity || 1);
            }
            else {
                cart.products.push({ product: new mongoose_1.default.Types.ObjectId(item.product), quantity: item.quantity || 1 });
            }
        }
        await cart.save();
        await cart.populate('products.product');
        res.status(200).json({ success: true, message: 'Cart synced successfully', data: cart });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error syncing cart' });
    }
};
exports.syncOfflineCart = syncOfflineCart;
