import { LoyaltySettingModel } from '../../../infrastructure/database/models/LoyaltySettingModel';

export class AdminLoyaltySettingUseCases {
    async getSettings() {
        let settings = await LoyaltySettingModel.findOne();
        if (!settings) {
            settings = await LoyaltySettingModel.create({});
        }
        return settings;
    }

    async updateSettings(data: any) {
        let settings = await LoyaltySettingModel.findOne();
        if (!settings) {
            settings = await LoyaltySettingModel.create(data);
        } else {
            Object.assign(settings, data);
            await settings.save();
        }
        return settings;
    }
}
