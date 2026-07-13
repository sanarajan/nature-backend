import { Request, Response } from 'express';
import { UserLoyaltyUseCases } from '../../application/usecases/user/UserLoyaltyUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

export class UserLoyaltyController {
    private loyaltyUseCases: UserLoyaltyUseCases;

    constructor() {
        this.loyaltyUseCases = new UserLoyaltyUseCases();
    }

    public async getAvailablePoints(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const data = await this.loyaltyUseCases.getDashboardInfo(userId);
            
            res.status(STATUS_CODES.OK).json({ success: true, message: 'User points fetched successfully', data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    public async spinWheel(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { pointsWon } = req.body;

            if (!userId) {
                res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            if (typeof pointsWon !== 'number') {
                res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid points amount' });
                return;
            }

            const points = await this.loyaltyUseCases.spinWheel(userId, pointsWon);
            
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Points won successfully', data: { points } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
}
