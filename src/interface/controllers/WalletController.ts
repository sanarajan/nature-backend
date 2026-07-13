import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { IGetWalletUseCase } from '../../application/interfaces/user/IWalletUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class WalletController {
    constructor(@inject('IGetWalletUseCase') private getWalletUseCase: IGetWalletUseCase) {}

    async getWallet(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const wallet = await this.getWalletUseCase.execute(userId);

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { wallet }
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server Error Fetching Wallet' 
            });
        }
    }
}
