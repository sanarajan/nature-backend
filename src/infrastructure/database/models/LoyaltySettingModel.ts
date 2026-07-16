import mongoose, { Schema, Document } from 'mongoose';

export interface ILoyaltySettingDocument extends Document {
    isLoyaltyEnabled: boolean;
    isEarningEnabled: boolean;
    isRedemptionEnabled: boolean;
    purchaseRewardSpendAmount: number;
    purchaseRewardEarnPoints: number;
    minOrderAmountToEarn: number;
    maxPointsEarnedPerOrder: number;
    pointValueInRupees: number;
    maxRedeemablePerOrder: number;
    minOrderAmountToRedeem: number;
    minPointsRequiredToRedeem: number;
    pointValidityDays: number;
    isWheelEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const loyaltySettingSchema = new Schema<ILoyaltySettingDocument>({
    isLoyaltyEnabled: { type: Boolean, default: true },
    isEarningEnabled: { type: Boolean, default: true },
    isRedemptionEnabled: { type: Boolean, default: true },
    purchaseRewardSpendAmount: { type: Number, default: 100 },
    purchaseRewardEarnPoints: { type: Number, default: 1 },
    minOrderAmountToEarn: { type: Number, default: 0 },
    maxPointsEarnedPerOrder: { type: Number, default: 0 },
    pointValueInRupees: { type: Number, default: 1 },
    maxRedeemablePerOrder: { type: Number, default: 20 },
    minOrderAmountToRedeem: { type: Number, default: 0 },
    minPointsRequiredToRedeem: { type: Number, default: 0 },
    pointValidityDays: { type: Number, default: 30 },
    isWheelEnabled: { type: Boolean, default: true }
}, { timestamps: true });

export const LoyaltySettingModel = mongoose.model<ILoyaltySettingDocument>('LoyaltySetting', loyaltySettingSchema);

