import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalBankSnapshot {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
}

export interface IWithdrawalRequestDocument extends Document {
    requestId: string;
    influencerId: mongoose.Types.ObjectId;
    amount: number;
    status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
    requestedAt: Date;
    approvedAt?: Date;
    rejectedAt?: Date;
    paidAt?: Date;
    processedAt?: Date;
    reason?: string;
    remarks?: string;
    adminRemarks?: string;
    transactionReference?: string;
    paymentMethod?: string;
    bankSnapshot?: IWithdrawalBankSnapshot;
    createdAt: Date;
    updatedAt: Date;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequestDocument>({
    requestId: { type: String, required: true, unique: true, index: true },
    influencerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Paid', 'Rejected'], default: 'Pending', index: true },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    paidAt: { type: Date },
    processedAt: { type: Date },
    reason: { type: String },
    remarks: { type: String },
    adminRemarks: { type: String },
    transactionReference: { type: String },
    paymentMethod: { type: String, default: 'Bank Transfer / UPI / NEFT / IMPS' },
    bankSnapshot: {
        accountHolderName: { type: String, default: '' },
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        upiId: { type: String, default: '' }
    }
}, { timestamps: true });

export const WithdrawalRequestModel = mongoose.model<IWithdrawalRequestDocument>('WithdrawalRequest', withdrawalRequestSchema);
