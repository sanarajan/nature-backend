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

        if (productIndex > -1) {
            cart.products.splice(productIndex, 1);
        } else {
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
            cart.products[productIndex].quantity = Number(quantity);
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

    async execute(userId: string, cartItems: any[], influencerRef?: string): Promise<any> {
        if (!cartItems || !Array.isArray(cartItems)) throw new ValidationError('Invalid cart items format');
        
        let cart = await this.cartRepository.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepository.createCart(userId);
        }

        for (const item of cartItems) {
            if (!item.product || !item.quantity) continue;
            
            const existingItem = cart.products.find((p: any) => p.product._id.toString() === item.product);
            if (existingItem) {
                existingItem.quantity += Number(item.quantity);
            } else {
                cart.products.push({ product: item.product, quantity: Number(item.quantity) });
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
