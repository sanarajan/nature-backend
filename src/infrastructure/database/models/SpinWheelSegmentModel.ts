import mongoose, { Schema, Document } from 'mongoose';

export type SpinRewardType = 'Percentage Discount' | 'Fixed Amount Discount' | 'Better Luck Next Time';

export interface ISpinWheelSegmentDocument extends Document {
    segmentName: string;
    rewardType: SpinRewardType;
    rewardValue: number;
    displayText: string;
    probability: number;
    color: string;
    isActive: boolean;
    order: number;
}

const spinWheelSegmentSchema = new Schema<ISpinWheelSegmentDocument>({
    segmentName: { type: String, required: true },
    rewardType: {
        type: String,
        enum: ['Percentage Discount', 'Fixed Amount Discount', 'Better Luck Next Time'],
        required: true
    },
    rewardValue: { type: Number, default: 0 },
    displayText: { type: String, required: true },
    probability: { type: Number, required: true, default: 10 },
    color: { type: String, required: true, default: '#0D775E' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

export const SpinWheelSegmentModel = mongoose.model<ISpinWheelSegmentDocument>('SpinWheelSegment', spinWheelSegmentSchema);
