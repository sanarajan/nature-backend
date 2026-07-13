import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IToggleWishlistUseCase,
    IGetWishlistUseCase,
    ISyncWishlistUseCase
} from '../../application/interfaces/user/IWishlistUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class WishlistController {
    constructor(
        @inject('IToggleWishlistUseCase') private toggleWishlistUseCase: IToggleWishlistUseCase,
        @inject('IGetWishlistUseCase') private getWishlistUseCase: IGetWishlistUseCase,
        @inject('ISyncWishlistUseCase') private syncWishlistUseCase: ISyncWishlistUseCase
    ) {}

    async toggleWishlist(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { productId } = req.body;

            const result = await this.toggleWishlistUseCase.execute(userId, productId);
            const message = result.action === 'added' ? 'Added to wishlist' : 'Removed from wishlist';
            const statusCode = result.action === 'added' ? STATUS_CODES.CREATED : STATUS_CODES.OK;

            res.status(statusCode).json({ success: true, message, action: result.action });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error toggling wishlist' 
            });
        }
    }

    async getWishlist(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const products = await this.getWishlistUseCase.execute(userId);
            
            res.status(STATUS_CODES.OK).json({ success: true, data: products });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error fetching wishlist' 
            });
        }
    }

    async syncWishlist(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { productIds } = req.body;

            await this.syncWishlistUseCase.execute(userId, productIds);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Wishlist synced' });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error syncing wishlist' 
            });
        }
    }
}
