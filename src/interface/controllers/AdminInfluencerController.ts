import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IGetAllInfluencersUseCase,
    IGetInfluencerStatsUseCase,
    IUpdateInfluencerUseCase,
    IGetWithdrawalRequestsUseCase,
    IProcessWithdrawalUseCase
} from '../../application/interfaces/admin/IAdminInfluencerUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class AdminInfluencerController {
    constructor(
        @inject('IGetAllInfluencersUseCase') private getAllInfluencersUseCase: IGetAllInfluencersUseCase,
        @inject('IGetInfluencerStatsUseCase') private getInfluencerStatsUseCase: IGetInfluencerStatsUseCase,
        @inject('IUpdateInfluencerUseCase') private updateInfluencerUseCase: IUpdateInfluencerUseCase,
        @inject('IGetWithdrawalRequestsUseCase') private getWithdrawalRequestsUseCase: IGetWithdrawalRequestsUseCase,
        @inject('IProcessWithdrawalUseCase') private processWithdrawalUseCase: IProcessWithdrawalUseCase
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
}
