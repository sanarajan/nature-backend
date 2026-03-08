import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponDocument extends Document {
    couponName: string;
    couponImage?: string[];
    startDate: Date;
    endDate: Date;
    description: string;
    minPurchase: number;
    discountType: 'Percentage' | 'Amount';
    discountPercentage?: number;
    discountValue?: number;
    status: boolean;
    userUsageLimit?: number;
}

const couponSchema = new Schema<ICouponDocument>({
    couponName: { type: String, required: true, unique: true },
    couponImage: [String],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, required: true },
    minPurchase: { type: Number, required: true },
    discountType: { type: String, enum: ['Percentage', 'Amount'], required: true },
    discountPercentage: {
        type: Number,
        required: function () { return this.discountType === 'Percentage'; }
    },
    discountValue: {
        type: Number,
        required: function () { return this.discountType === 'Amount'; }
    },
    status: { type: Boolean, default: true },
    userUsageLimit: { type: Number, default: null }
}, { timestamps: true });

export const CouponModel = mongoose.model<ICouponDocument>('Coupon', couponSchema);
