import mongoose, { Schema, Document } from 'mongoose';

export interface IInfluencerSettingDocument extends Document {
    influencerDiscountPercent: number;
    influencerCommissionPercent: number;
    referralCookieDays: number;
    influencerEnabled: boolean;
    isActive: boolean; // Only one active document usually
    createdAt: Date;
    updatedAt: Date;
}

const influencerSettingSchema = new Schema<IInfluencerSettingDocument>({
    influencerDiscountPercent: { type: Number, default: 20 },
    influencerCommissionPercent: { type: Number, default: 20 },
    referralCookieDays: { type: Number, default: 30 },
    influencerEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const InfluencerSettingModel = mongoose.model<IInfluencerSettingDocument>('InfluencerSetting', influencerSettingSchema);
