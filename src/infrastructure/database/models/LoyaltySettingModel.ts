import mongoose, { Schema, Document } from 'mongoose';

export interface ILoyaltySettingDocument extends Document {
    isLoyaltyEnabled: boolean;
    purchaseRewardSpendAmount: number;
    purchaseRewardEarnPoints: number;
    pointValueInRupees: number;
    maxRedeemablePerOrder: number;
    pointValidityDays: number;
    isWheelEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const loyaltySettingSchema = new Schema<ILoyaltySettingDocument>({
    isLoyaltyEnabled: { type: Boolean, default: true },
    purchaseRewardSpendAmount: { type: Number, default: 100 },
    purchaseRewardEarnPoints: { type: Number, default: 1 },
    pointValueInRupees: { type: Number, default: 1 },
    maxRedeemablePerOrder: { type: Number, default: 20 },
    pointValidityDays: { type: Number, default: 30 },
    isWheelEnabled: { type: Boolean, default: true }
}, { timestamps: true });

export const LoyaltySettingModel = mongoose.model<ILoyaltySettingDocument>('LoyaltySetting', loyaltySettingSchema);
