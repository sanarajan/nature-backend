import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetCartUseCase,
    IToggleCartItemUseCase,
    IUpdateCartItemQuantityUseCase,
    IRemoveCartItemUseCase,
    ISyncOfflineCartUseCase,
    ICalculateCartTotalsUseCase
} from '../../application/interfaces/user/ICartUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class CartController {
    constructor(
        @inject('IGetCartUseCase') private getCartUseCase: IGetCartUseCase,
        @inject('IToggleCartItemUseCase') private toggleCartItemUseCase: IToggleCartItemUseCase,
        @inject('IUpdateCartItemQuantityUseCase') private updateCartItemQuantityUseCase: IUpdateCartItemQuantityUseCase,
        @inject('IRemoveCartItemUseCase') private removeCartItemUseCase: IRemoveCartItemUseCase,
        @inject('ISyncOfflineCartUseCase') private syncOfflineCartUseCase: ISyncOfflineCartUseCase,
        @inject('ICalculateCartTotalsUseCase') private calculateCartTotalsUseCase: ICalculateCartTotalsUseCase
    ) {}

    public async getCart(req: Request, res: Response): Promise<void> {
        try {
            console.log("Cart API req.cookies: ", req.cookies);
            const userId = (req as any).user?.id;
            const influencerRef = req.cookies?.influencer_ref;
            const calculatedCart = await this.getCartUseCase.execute(userId, influencerRef);
            res.status(STATUS_CODES.OK).json({ success: true, data: calculatedCart });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error fetching cart' });
        }
    }

    async toggleCartItem(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const influencerRef = req.cookies?.influencer_ref;
            const { productId, quantity = 1 } = req.body;
            const calculatedCart = await this.toggleCartItemUseCase.execute(userId, productId, quantity, influencerRef);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Cart updated', data: calculatedCart });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error updating cart' });
        }
    }

    async updateCartItemQuantity(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const influencerRef = req.cookies?.influencer_ref;
            const { productId, quantity } = req.body;
            const calculatedCart = await this.updateCartItemQuantityUseCase.execute(userId, productId, quantity, influencerRef);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Quantity updated', data: calculatedCart });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error updating item quantity' });
        }
    }

    async removeCartItem(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const influencerRef = req.cookies?.influencer_ref;
            const productId = req.params.productId as string;
            const calculatedCart = await this.removeCartItemUseCase.execute(userId, productId, influencerRef);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Product removed from cart', data: calculatedCart });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error removing item from cart' });
        }
    }

    public async syncOfflineCart(req: Request, res: Response): Promise<void> {
        try {
            console.log("Cart API syncOfflineCart req.cookies: ", req.cookies);
            const userId = (req as any).user?.id;
            const influencerRef = req.cookies?.influencer_ref;
            const { cartItems } = req.body;
            const calculatedCart = await this.syncOfflineCartUseCase.execute(userId, cartItems, influencerRef);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Cart synced successfully', data: calculatedCart });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error calculating totals' });
        }
    }

    async calculateCartTotals(req: Request, res: Response): Promise<void> {
        try {
            const { products } = req.body;
            const result = await this.calculateCartTotalsUseCase.execute(products);
            res.status(STATUS_CODES.OK).json({ success: true, data: result });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error calculating totals' });
        }
    }
}

