import mongoose, { Schema, Document } from 'mongoose';

export interface IAddressDocument extends Document {
    house?: string;
    place?: string;
    city: string;
    district?: string;
    state: string;
    pincode: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    country?: string;
    street1?: string;
    street2?: string;
    isDefault?: boolean;
}

const addressSchema = new Schema<IAddressDocument>({
    house: { type: String, required: false },
    place: { type: String, required: false },
    city: { type: String, required: true },
    district: { type: String, required: false },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    company: { type: String, required: false },
    country: { type: String, required: false, default: 'India' },
    street1: { type: String, required: false },
    street2: { type: String, required: false },
    isDefault: { type: Boolean, default: false }
});

export const AddressModel = mongoose.model<IAddressDocument>('Address', addressSchema);
