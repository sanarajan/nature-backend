import mongoose, { Schema, Document } from 'mongoose';

export interface ISpinWheelSettingDocument extends Document {
    isEnabled: boolean;
    startDate: Date;
    endDate: Date;
    spinIntervalDays: number;
    couponValidityDays: number;
    maxCouponUsage: number | null;
    showPopupAfterLogin: boolean;
    loggedInOnly: boolean;
}

const spinWheelSettingSchema = new Schema<ISpinWheelSettingDocument>({
    isEnabled: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    spinIntervalDays: { type: Number, default: 90 },
    couponValidityDays: { type: Number, default: 30 },
    maxCouponUsage: { type: Number, default: 1 },
    showPopupAfterLogin: { type: Boolean, default: true },
    loggedInOnly: { type: Boolean, default: true }
}, { timestamps: true });

export const SpinWheelSettingModel = mongoose.model<ISpinWheelSettingDocument>('SpinWheelSetting', spinWheelSettingSchema);
