import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryDocument extends Document {
    categoryName: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategoryDocument>({
    categoryName: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const CategoryModel = mongoose.model<ICategoryDocument>('Category', categorySchema);
