import mongoose, { Schema, Document } from 'mongoose';

export interface ICountryDocument extends Document {
    name: string;
    code: string;
    isActive: boolean;
}

const countrySchema = new Schema<ICountryDocument>({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const CountryModel = mongoose.model<ICountryDocument>('Country', countrySchema);
