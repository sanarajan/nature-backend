import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction {
    _id?: mongoose.Types.ObjectId;
    transactionType: 'credit' | 'debit' | 'referral' | 'purchase' | 'refund' | 'commission';
    amount: number;
    date: Date;
    description?: string;
    orderId?: string;
    productId?: mongoose.Types.ObjectId;
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
            enum: ['credit', 'debit', 'referral', 'purchase', 'refund', 'commission']
        },
        amount: { type: Number, default: 0 },
        date: { type: Date, default: null },
        description: { type: String },
        orderId: { type: String },
        productId: { type: Schema.Types.ObjectId, ref: 'Product' }
    }]
}, { timestamps: true });

export const WalletModel = mongoose.model<IWalletDocument>('Wallet', walletSchema);
