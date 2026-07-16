import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetAllInfluencersUseCase,
    IGetInfluencerStatsUseCase,
    IUpdateInfluencerUseCase,
    IGetWithdrawalRequestsUseCase,
    IProcessWithdrawalUseCase,
    IGetInfluencerRequestsUseCase,
    IApproveInfluencerRequestUseCase,
    IRejectInfluencerRequestUseCase,
    IGetInfluencerProductsUseCase,
    IUpdateProductInfluencerDiscountUseCase
} from '../../application/interfaces/admin/IAdminInfluencerUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { AdminNotificationModel } from '../../infrastructure/database/models/AdminNotificationModel';

@injectable()
export class AdminInfluencerController {
    constructor(
        @inject('IGetAllInfluencersUseCase') private getAllInfluencersUseCase: IGetAllInfluencersUseCase,
        @inject('IGetInfluencerStatsUseCase') private getInfluencerStatsUseCase: IGetInfluencerStatsUseCase,
        @inject('IUpdateInfluencerUseCase') private updateInfluencerUseCase: IUpdateInfluencerUseCase,
        @inject('IGetWithdrawalRequestsUseCase') private getWithdrawalRequestsUseCase: IGetWithdrawalRequestsUseCase,
        @inject('IProcessWithdrawalUseCase') private processWithdrawalUseCase: IProcessWithdrawalUseCase,
        @inject('IGetInfluencerRequestsUseCase') private getInfluencerRequestsUseCase: IGetInfluencerRequestsUseCase,
        @inject('IApproveInfluencerRequestUseCase') private approveInfluencerRequestUseCase: IApproveInfluencerRequestUseCase,
        @inject('IRejectInfluencerRequestUseCase') private rejectInfluencerRequestUseCase: IRejectInfluencerRequestUseCase,
        @inject('IGetInfluencerProductsUseCase') private getInfluencerProductsUseCase: IGetInfluencerProductsUseCase,
        @inject('IUpdateProductInfluencerDiscountUseCase') private updateProductInfluencerDiscountUseCase: IUpdateProductInfluencerDiscountUseCase
    ) {}

    async getAllInfluencers(req: Request, res: Response): Promise<void> {
        try {
            const influencers = await this.getAllInfluencersUseCase.execute();
            res.status(STATUS_CODES.OK).json({ success: true, data: influencers });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getInfluencerStats(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const data = await this.getInfluencerStatsUseCase.execute(id);
            res.status(STATUS_CODES.OK).json({ success: true, data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async updateInfluencer(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const data = await this.updateInfluencerUseCase.execute(id, req.body);
            res.status(STATUS_CODES.OK).json({ success: true, data });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getWithdrawalRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await this.getWithdrawalRequestsUseCase.execute();
            res.status(STATUS_CODES.OK).json({ success: true, data: requests });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async processWithdrawal(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const { status, remarks } = req.body;
            const request = await this.processWithdrawalUseCase.execute(id, status, remarks);
            res.status(STATUS_CODES.OK).json({ success: true, data: request });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await this.getInfluencerRequestsUseCase.execute();
            res.status(STATUS_CODES.OK).json({ success: true, data: requests });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async approveRequest(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const user = await this.approveInfluencerRequestUseCase.execute(id);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Influencer request approved successfully', data: user });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async rejectRequest(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const { reason } = req.body;
            const user = await this.rejectInfluencerRequestUseCase.execute(id, reason);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Influencer request rejected successfully', data: user });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getNotifications(req: Request, res: Response): Promise<void> {
        try {
            const notifications = await AdminNotificationModel.find().sort({ createdAt: -1 }).limit(20).exec();
            const unreadCount = await AdminNotificationModel.countDocuments({ isRead: false });
            res.status(STATUS_CODES.OK).json({ success: true, data: { notifications, unreadCount } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async markNotificationRead(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const notification = await AdminNotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
            res.status(STATUS_CODES.OK).json({ success: true, data: notification });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async getProducts(req: Request, res: Response): Promise<void> {
        try {
            const query = (req.query.search || req.query.query || '') as string;
            const products = await this.getInfluencerProductsUseCase.execute(query);
            res.status(STATUS_CODES.OK).json({ success: true, data: products });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    async updateProductDiscount(req: Request, res: Response): Promise<void> {
        try {
            const productId = req.params.productId as string;
            const { influencerDiscount } = req.body;
            const updated = await this.updateProductInfluencerDiscountUseCase.execute(productId, influencerDiscount);
            res.status(STATUS_CODES.OK).json({ success: true, data: updated, message: 'Product influencer discount updated successfully' });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
}

