import { inject, injectable } from 'tsyringe';
import { IInfluencerSettingRepository } from '../../../domain/repositories/IInfluencerSettingRepository';

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
        return await this.influencerSettingRepository.updateSettings(data);
    }
}
