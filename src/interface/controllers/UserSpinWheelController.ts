import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { UserSpinWheelUseCases } from '../../application/usecases/user/UserSpinWheelUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class UserSpinWheelController {
    constructor(
        @inject(UserSpinWheelUseCases) private userSpinWheelUseCases: UserSpinWheelUseCases
    ) {}

    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).user?._id;
            const status = await this.userSpinWheelUseCases.getStatus(userId);
            res.status(STATUS_CODES.OK).json({ success: true, data: status });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch spin wheel status'
            });
        }
    }

    async spin(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).user?._id;
            const result = await this.userSpinWheelUseCases.spin(userId);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Wheel spun successfully', data: result });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to spin wheel'
            });
        }
    }

    async getMyRewards(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).user?._id;
            const rewards = await this.userSpinWheelUseCases.getMyRewards(userId);
            res.status(STATUS_CODES.OK).json({ success: true, data: { rewards } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch rewards'
            });
        }
    }
}
