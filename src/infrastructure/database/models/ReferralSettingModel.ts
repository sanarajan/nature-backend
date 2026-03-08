import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralSettingDocument extends Document {
    offerPercentage: number; // Discount/Reward for the Referrer
    joiningDiscountPercentage: number; // Discount for the new user (Referee)
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const referralSettingSchema = new Schema<IReferralSettingDocument>({
    offerPercentage: { type: Number, default: 20 },
    joiningDiscountPercentage: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const ReferralSettingModel = mongoose.model<IReferralSettingDocument>('ReferralSetting', referralSettingSchema);
