import mongoose, { Schema, Document } from 'mongoose';

export interface ISubCategoryDocument extends Document {
    subcategoryName: string;
    categoryId: mongoose.Types.ObjectId;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const subCategorySchema = new Schema<ISubCategoryDocument>({
    subcategoryName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index for uniqueness: Name + Category
subCategorySchema.index({ subcategoryName: 1, categoryId: 1 }, { unique: true });

export const SubCategoryModel = mongoose.model<ISubCategoryDocument>('SubCategory', subCategorySchema);
