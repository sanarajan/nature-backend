import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetInfluencerSettingsUseCase, UpdateInfluencerSettingsUseCase } from '../../application/usecases/admin/InfluencerSettingUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class AdminInfluencerSettingController {
    constructor(
        @inject('IGetInfluencerSettingsUseCase') private getInfluencerSettingsUseCase: GetInfluencerSettingsUseCase,
        @inject('IUpdateInfluencerSettingsUseCase') private updateInfluencerSettingsUseCase: UpdateInfluencerSettingsUseCase
    ) {}

    public async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await this.getInfluencerSettingsUseCase.execute();
            res.status(STATUS_CODES.OK).json({ success: true, data: settings });
        } catch (error: any) {
            next(error);
        }
    }

    public async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await this.updateInfluencerSettingsUseCase.execute(req.body);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Settings updated successfully', data: settings });
        } catch (error: any) {
            next(error);
        }
    }
}
