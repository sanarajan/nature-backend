import { ReferralSettingModel } from '../models/ReferralSettingModel';

export const seedReferralSettings = async () => {
    try {
        const existing = await ReferralSettingModel.findOne();
        if (!existing) {
            await ReferralSettingModel.create({
                offerPercentage: 20, // Discount or reward to the referrer
                joiningDiscountPercentage: 20, // Discount for the new user who registers
                isActive: true
            });
            console.log('Referral settings initialized with 20% default discount.');
        } else {
            console.log('Referral settings already exist.');
        }
    } catch (error) {
        console.error('Error seeding referral settings:', error);
    }
};
