import { injectable } from 'tsyringe';
import { ICartRepository } from '../../../domain/repositories/ICartRepository';
import { CartModel } from '../models/CartModel';

@injectable()
export class CartRepository implements ICartRepository {
    async findByUserId(userId: string): Promise<any | null> {
        return CartModel.findOne({ user: userId, isActive: true })
            .populate({
                path: 'products.product',
                populate: [
                    { path: 'categoryId', select: 'categoryName _id' },
                    { path: 'subcategoryId', select: 'subcategoryName _id' }
                ]
            })
            .exec();
    }

    async createCart(userId: string): Promise<any> {
        return CartModel.create({ user: userId, products: [], isActive: true });
    }

    async save(cart: any): Promise<any> {
        return cart.save();
    }
}
