import { Request, Response } from 'express';
import { CartModel } from '../../infrastructure/database/models/CartModel';
import mongoose from 'mongoose';

export const getCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        let cart = await CartModel.findOne({ user: userId, isActive: true })
            .populate('products.product');

        if (!cart) {
            cart = await CartModel.create({ user: userId, products: [], isActive: true });
        }

        res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching cart' });
    }
};

export const toggleCartItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        let cart = await CartModel.findOne({ user: userId, isActive: true });

        if (!cart) {
            cart = new CartModel({ user: userId, products: [], isActive: true });
        }

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

        if (productIndex > -1) {
            // If exists, increment quantity (or just rely on the requested quantity)
            cart.products[productIndex].quantity += quantity;
        } else {
            // Add new product
            cart.products.push({ product: new mongoose.Types.ObjectId(productId), quantity });
        }

        await cart.save();
        await cart.populate('products.product');

        res.status(200).json({ success: true, message: 'Cart updated', data: cart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating cart' });
    }
};

export const updateCartItemQuantity = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid product details' });
        }

        const cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
        if (productIndex > -1) {
            cart.products[productIndex].quantity = quantity;
            await cart.save();
            await cart.populate('products.product');
            res.status(200).json({ success: true, message: 'Quantity updated', data: cart });
        } else {
            res.status(404).json({ success: false, message: 'Product not in cart' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating item quantity' });
    }
};

export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId } = req.params;

        const cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        cart.products = cart.products.filter(p => p.product.toString() !== productId);
        await cart.save();
        await cart.populate('products.product');

        res.status(200).json({ success: true, message: 'Product removed from cart', data: cart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error removing item from cart' });
    }
};

export const syncOfflineCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { cartItems } = req.body; // Array of { product: productId, quantity }

        if (!cartItems || !Array.isArray(cartItems)) {
            return res.status(400).json({ success: false, message: 'Invalid cart items format' });
        }

        let cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) {
            cart = new CartModel({ user: userId, products: [], isActive: true });
        }

        for (const item of cartItems) {
            const index = cart.products.findIndex(p => p.product.toString() === item.product);
            if (index > -1) {
                cart.products[index].quantity += (item.quantity || 1);
            } else {
                cart.products.push({ product: new mongoose.Types.ObjectId(item.product), quantity: item.quantity || 1 });
            }
        }

        await cart.save();
        await cart.populate('products.product');

        res.status(200).json({ success: true, message: 'Cart synced successfully', data: cart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error syncing cart' });
    }
};
