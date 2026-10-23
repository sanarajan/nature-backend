import mongoose, { Schema, Document } from 'mongoose';

export interface INewsDocument extends Document {
    title: string;
    summary?: string;
    content?: string;
    publishedDate: Date;
    imageUrl: string;
    imagePublicId?: string;
    websiteUrl?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const newsSchema = new Schema<INewsDocument>({
    title: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, default: '' },
    content: { type: String, trim: true, default: '' },
    publishedDate: { type: Date, default: Date.now },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    websiteUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export const NewsModel = mongoose.model<INewsDocument>('News', newsSchema);
