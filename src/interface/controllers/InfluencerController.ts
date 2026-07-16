import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase,
    ITrackReferralVisitUseCase
} from '../../application/interfaces/user/IInfluencerUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';

@injectable()
export class InfluencerController {
    constructor(
        @inject('IGetInfluencerDashboardUseCase') private getInfluencerDashboardUseCase: IGetInfluencerDashboardUseCase,
        @inject('IRequestWithdrawalUseCase') private requestWithdrawalUseCase: IRequestWithdrawalUseCase,
        @inject('IUpgradeToInfluencerUseCase') private upgradeToInfluencerUseCase: IUpgradeToInfluencerUseCase,
        @inject('ITrackReferralVisitUseCase') private trackReferralVisitUseCase: ITrackReferralVisitUseCase
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
            const socialProfiles = req.body?.socialProfiles;
            const result = await this.upgradeToInfluencerUseCase.execute(userId, socialProfiles);
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

    async trackVisit(req: Request, res: Response): Promise<void> {
        try {
            const { code, sessionId } = req.body;
            if (!code || !sessionId) {
                res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Code and sessionId are required' });
                return;
            }

            // Attach authenticated userId if available (optional — guest visitors are also tracked)
            const userId: string | null = (req as any).user?.id || null;

            await this.trackReferralVisitUseCase.execute(code, sessionId, userId);

            // Always respond 200 — we never reveal whether the visit was counted or a duplicate
            res.status(STATUS_CODES.OK).json({ success: true });
        } catch (error: any) {
            // Swallow errors — visit tracking must never disrupt the user experience
            res.status(STATUS_CODES.OK).json({ success: false });
        }
    }
}
