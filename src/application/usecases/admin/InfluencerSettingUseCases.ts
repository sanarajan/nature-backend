import { inject, injectable } from 'tsyringe';
import { IInfluencerSettingRepository } from '../../../domain/repositories/IInfluencerSettingRepository';
import { ValidationError } from '../../../shared/utils/AppError';

@injectable()
export class GetInfluencerSettingsUseCase {
    constructor(
        @inject('IInfluencerSettingRepository') private influencerSettingRepository: IInfluencerSettingRepository
    ) {}

    async execute(): Promise<any> {
        return await this.influencerSettingRepository.getSettings();
    }
}

@injectable()
export class UpdateInfluencerSettingsUseCase {
    constructor(
        @inject('IInfluencerSettingRepository') private influencerSettingRepository: IInfluencerSettingRepository
    ) {}

    async execute(data: any): Promise<any> {
        if (data.minWithdrawalAmount !== undefined) {
            const minAmt = Number(data.minWithdrawalAmount);
            if (isNaN(minAmt) || minAmt <= 0) {
                throw new ValidationError('Minimum withdrawal amount must be greater than zero.');
            }
        }
        return await this.influencerSettingRepository.updateSettings(data);
    }
}
