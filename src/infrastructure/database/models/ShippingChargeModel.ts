import mongoose, { Schema, Document } from 'mongoose';

export interface IShippingChargeDocument extends Document {
    state: string;
    stateId: mongoose.Types.ObjectId;
    charge: number;
    isActive: boolean;
}

const shippingChargeSchema = new Schema<IShippingChargeDocument>({
    state: { type: String, required: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true, unique: true },
    charge: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const ShippingChargeModel = mongoose.model<IShippingChargeDocument>('ShippingCharge', shippingChargeSchema);

