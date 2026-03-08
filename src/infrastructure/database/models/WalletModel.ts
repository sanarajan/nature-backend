import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction {
    transactionType: 'credit' | 'debit' | 'referral' | 'purchase' | 'refund';
    amount: number;
    date: Date;
}

export interface IWalletDocument extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    history: ITransaction[];
    createdAt: Date;
    updatedAt: Date;
}

const walletSchema = new Schema<IWalletDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    history: [{
        transactionType: {
            type: String,
            enum: ['credit', 'debit', 'referral', 'purchase', 'refund']
        },
        amount: { type: Number, default: 0 },
        date: { type: Date, default: null }
    }]
}, { timestamps: true });

export const WalletModel = mongoose.model<IWalletDocument>('Wallet', walletSchema);
