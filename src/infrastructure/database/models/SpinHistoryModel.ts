import mongoose, { Schema, Document } from 'mongoose';

export interface ISpinHistoryDocument extends Document {
    user: mongoose.Types.ObjectId;
    segment: mongoose.Types.ObjectId;
    rewardType: string;
    rewardValue: number;
    couponId?: mongoose.Types.ObjectId;
    couponCode?: string;
    spunAt: Date;
}

const spinHistorySchema = new Schema<ISpinHistoryDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    segment: { type: Schema.Types.ObjectId, ref: 'SpinWheelSegment', required: true },
    rewardType: { type: String, required: true },
    rewardValue: { type: Number, default: 0 },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: '' },
    spunAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const SpinHistoryModel = mongoose.model<ISpinHistoryDocument>('SpinHistory', spinHistorySchema);
