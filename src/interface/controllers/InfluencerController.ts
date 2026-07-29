import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase,
    ITrackReferralVisitUseCase,
    IUpdateBankDetailsUseCase,
    IGetWithdrawalHistoryUseCase,
    IGetWithdrawalDetailsUseCase,
    IGetUserNotificationsUseCase
} from '../../application/interfaces/user/IInfluencerUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';

@injectable()
export class InfluencerController {
    constructor(
        @inject('IGetInfluencerDashboardUseCase') private getInfluencerDashboardUseCase: IGetInfluencerDashboardUseCase,
        @inject('IRequestWithdrawalUseCase') private requestWithdrawalUseCase: IRequestWithdrawalUseCase,
        @inject('IUpgradeToInfluencerUseCase') private upgradeToInfluencerUseCase: IUpgradeToInfluencerUseCase,
        @inject('ITrackReferralVisitUseCase') private trackReferralVisitUseCase: ITrackReferralVisitUseCase,
        @inject('IUpdateBankDetailsUseCase') private updateBankDetailsUseCase: IUpdateBankDetailsUseCase,
        @inject('IGetWithdrawalHistoryUseCase') private getWithdrawalHistoryUseCase: IGetWithdrawalHistoryUseCase,
        @inject('IGetWithdrawalDetailsUseCase') private getWithdrawalDetailsUseCase: IGetWithdrawalDetailsUseCase,
        @inject('IGetUserNotificationsUseCase') private getUserNotificationsUseCase: IGetUserNotificationsUseCase
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
            const data = await this.requestWithdrawalUseCase.execute(userId, Number(amount));
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Your withdrawal request has been submitted successfully.', data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async updateBankDetails(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { accountHolderName, bankName, accountNumber, ifscCode, upiId } = req.body;
            const data = await this.updateBankDetailsUseCase.execute(userId, {
                accountHolderName,
                bankName,
                accountNumber,
                ifscCode,
                upiId
            });
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Bank details updated successfully', data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getWithdrawalHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = req.query.status as string;
            const data = await this.getWithdrawalHistoryUseCase.execute(userId, page, limit, status);
            res.status(STATUS_CODES.OK).json({ success: true, data: data.requests, pagination: data.pagination });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getWithdrawalDetails(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const requestId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
            const data = await this.getWithdrawalDetailsUseCase.execute(userId, requestId);
            res.status(STATUS_CODES.OK).json({ success: true, data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getUserNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const data = await this.getUserNotificationsUseCase.execute(userId);
            res.status(STATUS_CODES.OK).json({ success: true, data });
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

            const userId: string | null = (req as any).user?.id || null;
            await this.trackReferralVisitUseCase.execute(code, sessionId, userId);
            res.status(STATUS_CODES.OK).json({ success: true });
        } catch (error: any) {
            res.status(STATUS_CODES.OK).json({ success: false });
        }
    }
}
