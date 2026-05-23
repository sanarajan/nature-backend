import mongoose, { Schema, Document } from 'mongoose';

export interface IOfferDocument extends Document {
    offerName: string;
    offerFor: 'product' | 'category';
    productId?: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    discountType: 'percentage' | 'amount';
    discountValue: number;
    startDate: Date;
    endDate: Date;
    status: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OfferSchema = new Schema<IOfferDocument>({
    offerName: { type: String, required: true, trim: true },
    offerFor: { type: String, enum: ['product', 'category'], required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    discountType: { type: String, enum: ['percentage', 'amount'], required: true },
    discountValue: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const OfferModel = mongoose.model<IOfferDocument>('Offer', OfferSchema);
