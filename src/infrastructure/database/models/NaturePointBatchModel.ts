import mongoose, { Schema, Document } from 'mongoose';

export interface INaturePointBatchDocument extends Document {
    userId: mongoose.Types.ObjectId;
    pointsEarned: number;
    remainingPoints: number;
    source: 'Purchase' | 'Wheel Reward' | 'Admin Adjustment' | 'Referral';
    sourceId?: string; // e.g. Order ID or specific reference
    expiryDate: Date;
    status: 'Active' | 'Expired' | 'Depleted';
    createdAt: Date;
    updatedAt: Date;
}

const naturePointBatchSchema = new Schema<INaturePointBatchDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pointsEarned: { type: Number, required: true },
    remainingPoints: { type: Number, required: true },
    source: {
        type: String,
        enum: ['Purchase', 'Wheel Reward', 'Admin Adjustment', 'Referral'],
        required: true
    },
    sourceId: { type: String, default: null },
    expiryDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Depleted'],
        default: 'Active'
    }
}, { timestamps: true });

export const NaturePointBatchModel = mongoose.model<INaturePointBatchDocument>('NaturePointBatch', naturePointBatchSchema);
