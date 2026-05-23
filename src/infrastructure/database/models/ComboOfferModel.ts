import mongoose, { Schema, Document } from 'mongoose';

export interface IComboOfferDocument extends Document {
    offerName: string;
    products: { productId: mongoose.Types.ObjectId; requiredQuantity: number }[]; // List of products and their required quantities
    discountType: 'percentage' | 'amount';
    discountValue: number;
    startDate: Date;
    endDate: Date;
    maxUsagePerOrder?: number;
    imageUrl?: string;
    status: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ComboOfferSchema = new Schema<IComboOfferDocument>({
    offerName: { type: String, required: true, trim: true },
    products: [{ 
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        requiredQuantity: { type: Number, required: true, default: 1 }
    }],
    discountType: { type: String, enum: ['percentage', 'amount'], default: 'amount' },
    discountValue: { type: Number, required: true },
    maxUsagePerOrder: { type: Number, default: 0 }, // 0 means unlimited
    imageUrl: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const ComboOfferModel = mongoose.model<IComboOfferDocument>('ComboOffer', ComboOfferSchema);
