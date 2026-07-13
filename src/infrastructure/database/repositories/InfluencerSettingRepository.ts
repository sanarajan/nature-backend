import { IInfluencerSettingRepository } from '../../../domain/repositories/IInfluencerSettingRepository';
import { InfluencerSettingModel } from '../models/InfluencerSettingModel';

export class InfluencerSettingRepository implements IInfluencerSettingRepository {
    async getSettings(): Promise<any> {
        let settings = await InfluencerSettingModel.findOne({ isActive: true });
        if (!settings) {
            settings = await InfluencerSettingModel.create({
                influencerDiscountPercent: 20,
                influencerCommissionPercent: 20,
                referralCookieDays: 30,
                influencerEnabled: true,
                isActive: true
            });
        }
        return settings;
    }

    async updateSettings(data: any): Promise<any> {
        const settings = await this.getSettings();
        Object.assign(settings, data);
        await settings.save();
        return settings;
    }
}
