import mongoose, { Schema, Document } from 'mongoose';

export interface IShippingAgency extends Document {
    name: string;
    url: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const shippingAgencySchema = new Schema<IShippingAgency>({
    name: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const ShippingAgencyModel = mongoose.model<IShippingAgency>('ShippingAgency', shippingAgencySchema);
