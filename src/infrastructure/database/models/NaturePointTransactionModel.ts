import mongoose, { Schema, Document } from 'mongoose';

export interface INaturePointTransactionDocument extends Document {
    userId: mongoose.Types.ObjectId;
    transactionType: 'Earned' | 'Redeemed' | 'Expired' | 'Reversed';
    points: number; // Positive for earned, negative for deducted
    source: string; // Description (e.g., 'Order #123', 'Wheel Reward')
    date: Date;
    batchRef?: mongoose.Types.ObjectId; // Optional ref to a specific batch if applicable
    createdAt: Date;
    updatedAt: Date;
}

const naturePointTransactionSchema = new Schema<INaturePointTransactionDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    transactionType: {
        type: String,
        enum: ['Earned', 'Redeemed', 'Expired', 'Reversed'],
        required: true
    },
    points: { type: Number, required: true },
    source: { type: String, required: true },
    date: { type: Date, default: Date.now },
    batchRef: { type: Schema.Types.ObjectId, ref: 'NaturePointBatch', default: null }
}, { timestamps: true });

export const NaturePointTransactionModel = mongoose.model<INaturePointTransactionDocument>('NaturePointTransaction', naturePointTransactionSchema);
