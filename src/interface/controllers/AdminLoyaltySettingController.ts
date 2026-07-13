import { Request, Response, NextFunction } from 'express';
import { AdminLoyaltySettingUseCases } from '../../application/usecases/admin/AdminLoyaltySettingUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

export class AdminLoyaltySettingController {
    constructor(private useCases: AdminLoyaltySettingUseCases) {}

    async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const settings = await this.useCases.getSettings();
            res.status(STATUS_CODES.OK).json({ success: true, settings });
        } catch (error) {
            next(error);
        }
    }

    async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const settings = await this.useCases.updateSettings(req.body);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Settings updated successfully', settings });
        } catch (error) {
            next(error);
        }
    }
}
