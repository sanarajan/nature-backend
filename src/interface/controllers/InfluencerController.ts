import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase
} from '../../application/interfaces/user/IInfluencerUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';

@injectable()
export class InfluencerController {
    constructor(
        @inject('IGetInfluencerDashboardUseCase') private getInfluencerDashboardUseCase: IGetInfluencerDashboardUseCase,
        @inject('IRequestWithdrawalUseCase') private requestWithdrawalUseCase: IRequestWithdrawalUseCase,
        @inject('IUpgradeToInfluencerUseCase') private upgradeToInfluencerUseCase: IUpgradeToInfluencerUseCase
    ) {}

    async getDashboardData(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const data = await this.getInfluencerDashboardUseCase.execute(userId);
            res.status(STATUS_CODES.OK).json({ success: true, data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async requestWithdrawal(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { amount } = req.body;
            const data = await this.requestWithdrawalUseCase.execute(userId, amount);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Withdrawal requested successfully', data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async upgradeToInfluencer(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const result = await this.upgradeToInfluencerUseCase.execute(userId);
            res.status(STATUS_CODES.OK).json({ success: true, message: result.message, data: { user: result.user } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getPublicSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = await InfluencerSettingModel.findOne({ isActive: true });
            res.status(STATUS_CODES.OK).json({ 
                success: true, 
                data: { influencerDiscountPercent: settings?.influencerDiscountPercent || 20 } 
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
}
