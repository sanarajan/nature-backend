"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedReferralSettings = void 0;
const ReferralSettingModel_1 = require("../models/ReferralSettingModel");
const seedReferralSettings = async () => {
    try {
        const existing = await ReferralSettingModel_1.ReferralSettingModel.findOne();
        if (!existing) {
            await ReferralSettingModel_1.ReferralSettingModel.create({
                offerPercentage: 20, // Discount or reward to the referrer
                joiningDiscountPercentage: 20, // Discount for the new user who registers
                isActive: true
            });
            console.log('Referral settings initialized with 20% default discount.');
        }
        else {
            console.log('Referral settings already exist.');
        }
    }
    catch (error) {
        console.error('Error seeding referral settings:', error);
    }
};
exports.seedReferralSettings = seedReferralSettings;
