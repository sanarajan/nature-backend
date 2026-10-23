import mongoose, { Schema, Document } from 'mongoose';

export interface ISponsorDocument extends Document {
    companyName: string;
    companyType: string;
    websiteUrl: string;
    imageUrl: string;
    imagePublicId?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const sponsorSchema = new Schema<ISponsorDocument>({
    companyName: { type: String, required: true, trim: true },
    companyType: { type: String, required: true, trim: true },
    websiteUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export const SponsorModel = mongoose.model<ISponsorDocument>('Sponsor', sponsorSchema);
