import { inject, injectable } from 'tsyringe';
import mongoose from 'mongoose';
import {
    IGetCartUseCase,
    IToggleCartItemUseCase,
    IUpdateCartItemQuantityUseCase,
    IRemoveCartItemUseCase,
    ISyncOfflineCartUseCase,
    ICalculateCartTotalsUseCase
} from '../../interfaces/user/ICartUseCases';
import { ICartRepository } from '../../../domain/repositories/ICartRepository';
import { ProductModel } from '../../../infrastructure/database/models/ProductModel';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import { SharedPricingService } from '../../services/SharedPricingService';

@injectable()
export class GetCartUseCase implements IGetCartUseCase {
    constructor(
        @inject('ICartRepository') private cartRepository: ICartRepository,
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, influencerRef?: string): Promise<any> {
        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepository.createCart(userId);
        } else {
            const initialLength = cart.products.length;
            cart.products = cart.products.filter((item: any) => item.product != null);
            if (cart.products.length !== initialLength) {
                await this.cartRepository.save(cart);
            }
        }
        return await this.sharedPricingService.calculate(cart, { userId, influencerRef });
    }
}

@injectable()
export class ToggleCartItemUseCase implements IToggleCartItemUseCase {
    constructor(
        @inject('ICartRepository') private cartRepository: ICartRepository,
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, productId: string, quantity: number = 1, influencerRef?: string): Promise<any> {
        if (!productId) throw new ValidationError('Product ID is required');

        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepository.createCart(userId);
        }

        const productIndex = cart.products.findIndex((p: any) => p.product._id.toString() === productId);
        const product = await ProductModel.findById(productId);
        
        if (!product || product.isActive === false) {
            throw new ValidationError('This product is currently unavailable.');
        }
        if (product.stock <= 0) {
            throw new ValidationError('This product is currently out of stock.');
        }

        if (productIndex > -1) {
            const newQty = cart.products[productIndex].quantity + Number(quantity);
            if (newQty > product.stock) {
                throw new ValidationError(`Only ${product.stock} item(s) are currently available.`);
            }
            cart.products[productIndex].quantity = newQty;
        } else {
            if (Number(quantity) > product.stock) {
                throw new ValidationError(`Only ${product.stock} item(s) are currently available.`);
            }
            cart.products.push({ product: productId, quantity: Number(quantity) });
        }

        await this.cartRepository.save(cart);
        const populatedCart = await this.cartRepository.findByUserId(userId);
        return await this.sharedPricingService.calculate(populatedCart, { userId, influencerRef });
    }
}

@injectable()
export class UpdateCartItemQuantityUseCase implements IUpdateCartItemQuantityUseCase {
    constructor(
        @inject('ICartRepository') private cartRepository: ICartRepository,
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, productId: string, quantity: number, influencerRef?: string): Promise<any> {
        if (!productId || quantity === undefined) throw new ValidationError('Invalid product details');

        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            throw new NotFoundError('Cart not found');
        }

        const productIndex = cart.products.findIndex((p: any) => p.product._id.toString() === productId);

        if (productIndex > -1) {
            const product = await ProductModel.findById(productId);
            if (!product || product.isActive === false) {
                throw new ValidationError('This product is currently unavailable.');
            }
            
            const requestedQuantity = Number(quantity);
            const currentQuantity = cart.products[productIndex].quantity;
            
            if (requestedQuantity > currentQuantity) {
                if (product.stock <= 0) {
                    throw new ValidationError('This product is currently out of stock.');
                }
                if (requestedQuantity > product.stock) {
                    throw new ValidationError(`Only ${product.stock} item(s) are currently available.`);
                }
            }
            
            cart.products[productIndex].quantity = requestedQuantity;
            await this.cartRepository.save(cart);
            const populatedCart = await this.cartRepository.findByUserId(userId);
            return await this.sharedPricingService.calculate(populatedCart, { userId, influencerRef });
        } else {
            throw new NotFoundError('Product not in cart');
        }
    }
}

@injectable()
export class RemoveCartItemUseCase implements IRemoveCartItemUseCase {
    constructor(
        @inject('ICartRepository') private cartRepository: ICartRepository,
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, productId: string, influencerRef?: string): Promise<any> {
        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) throw new NotFoundError('Cart not found');

        cart.products = cart.products.filter((p: any) => p.product._id.toString() !== productId);
        await this.cartRepository.save(cart);
        const populatedCart = await this.cartRepository.findByUserId(userId);
        return await this.sharedPricingService.calculate(populatedCart, { userId, influencerRef });
    }
}

@injectable()
export class SyncOfflineCartUseCase implements ISyncOfflineCartUseCase {
    constructor(
        @inject('ICartRepository') private cartRepository: ICartRepository,
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(userId: string, cartItems: any[], influencerRef?: string, isAtomicCombo?: boolean): Promise<any> {
        if (!cartItems || !Array.isArray(cartItems)) throw new ValidationError('Invalid cart items format');
        
        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepository.createCart(userId);
        }

        if (isAtomicCombo) {
            const aggregatedItems: { [key: string]: number } = {};
            for (const item of cartItems) {
                if (!item.product || !item.quantity) continue;
                aggregatedItems[item.product] = (aggregatedItems[item.product] || 0) + Number(item.quantity);
            }

            for (const [productId, incomingQty] of Object.entries(aggregatedItems)) {
                const product = await ProductModel.findById(productId);
                if (!product || product.isActive === false) {
                    throw new ValidationError('One or more products in this combo are currently unavailable.');
                }
                const existingItem = cart.products.find((p: any) => p.product._id.toString() === productId);
                const currentQty = existingItem ? existingItem.quantity : 0;
                
                if (product.stock <= 0) {
                    throw new ValidationError('One or more products in this combo are out of stock.');
                }
                if (currentQty + incomingQty > product.stock) {
                    throw new ValidationError(`Insufficient stock for product in combo.`);
                }
            }
        }

        for (const item of cartItems) {
            if (!item.product || !item.quantity) continue;
            
            const existingItem = cart.products.find((p: any) => p.product._id.toString() === item.product);
            const product = await ProductModel.findById(item.product);
            if (existingItem) {
                if (product && product.isActive !== false) {
                    const newQty = existingItem.quantity + Number(item.quantity);
                    existingItem.quantity = Math.max(existingItem.quantity, Math.min(newQty, product.stock));
                }
            } else {
                if (product && product.isActive !== false) {
                    const incomingQty = Number(item.quantity);
                    if (product.stock > 0) {
                        cart.products.push({ product: item.product, quantity: Math.min(incomingQty, product.stock) });
                    }
                }
            }
        }
        await this.cartRepository.save(cart);
        const populatedCart = await this.cartRepository.findByUserId(userId);
        return await this.sharedPricingService.calculate(populatedCart, { userId, influencerRef });
    }
}

@injectable()
export class CalculateCartTotalsUseCase implements ICalculateCartTotalsUseCase {
    constructor(
        @inject('ISharedPricingService') private sharedPricingService: SharedPricingService
    ) {}

    async execute(products: any[]): Promise<any> {
        if (!products || !Array.isArray(products)) {
            throw new ValidationError("Invalid cart data");
        }

        const productIds = products.map(p => (p.product?._id || p.product)?.toString()).filter(id => id && mongoose.isValidObjectId(id));
        
        const productDocs = await ProductModel.find({ _id: { $in: productIds } })
            .populate("categoryId", "categoryName _id")
            .populate("subcategoryId", "subcategoryName _id")
            .lean();

        const cartItemsForCalc = products.map(p => {
            const pId = (p.product?._id || p.product)?.toString();
            return { 
                product: productDocs.find(d => d._id.toString() === pId), 
                quantity: Number(p.quantity) || 1 
            };
        });

        const cartData = {
            products: cartItemsForCalc,
            toObject: function() { return this; }
        };

        return await this.sharedPricingService.calculate(cartData as any, {});
    }
}
