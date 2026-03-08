import mongoose, { Schema, Document } from 'mongoose';

export interface IOfferDocument extends Document {
    offerName: string;
    startDate: Date;
    endDate: Date;
    offerFor: 'product' | 'category';
    products?: mongoose.Types.ObjectId;
    categories?: mongoose.Types.ObjectId;
    offerType?: 'percentage' | 'amount';
    offerPercentage?: number;
    offerAmount?: number;
    productPrice?: number;
    offerPrice?: number;
    description?: string;
    status: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OfferSchema = new Schema<IOfferDocument>({
    offerName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    offerFor: { type: String, enum: ['product', 'category'], required: true },
    products: { type: Schema.Types.ObjectId, ref: 'Product' },
    categories: { type: Schema.Types.ObjectId, ref: 'Category' },
    offerType: { type: String, enum: ['percentage', 'amount'] },
    offerPercentage: { type: Number },
    offerAmount: { type: Number, default: 0 },
    productPrice: { type: Number },
    offerPrice: { type: Number },
    description: { type: String, trim: true },
    status: { type: Boolean, default: true }
}, { timestamps: true });

export const OfferModel = mongoose.model<IOfferDocument>('Offer', OfferSchema);
