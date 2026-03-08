import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { WalletModel } from '../../infrastructure/database/models/WalletModel';

@injectable()
export class WalletController {
    public async getWallet(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const wallet = await WalletModel.findOne({ userId });

            if (!wallet) {
                res.status(404).json({ success: false, message: 'Wallet not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: { wallet }
            });
        } catch (error: any) {
            console.error('Get Wallet Error:', error);
            res.status(500).json({ success: false, message: 'Server Error Fetching Wallet' });
        }
    }
}
