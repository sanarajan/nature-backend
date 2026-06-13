import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalRequestDocument extends Document {
    influencerId: mongoose.Types.ObjectId;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    requestedAt: Date;
    processedAt?: Date;
    adminRemarks?: string;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequestDocument>({
    influencerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    adminRemarks: { type: String }
}, { timestamps: true });

export const WithdrawalRequestModel = mongoose.model<IWithdrawalRequestDocument>('WithdrawalRequest', withdrawalRequestSchema);
