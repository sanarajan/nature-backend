import mongoose, { Schema, Document } from 'mongoose';

export interface IProductDocument extends Document {
    productName: string;
    sku: string;
    categoryId: mongoose.Types.ObjectId;
    subcategoryId?: mongoose.Types.ObjectId;
    unitId: mongoose.Types.ObjectId;
    specifications?: Map<string, string>;
    description?: string;
    price: number;
    quantity: number; // Represents volume/weight e.g. 50
    stock: number; // Represents available inventory e.g. 100
    images: string[];
    thumbnailPaths: string[];
    featured: boolean;
    isPopular: boolean;
    isTrending: boolean;
    isBestSeller: boolean;
    isActive: boolean;
}

const productSchema = new Schema<IProductDocument>({
    productName: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    specifications: { type: Map, of: String },
    description: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    images: [String],
    thumbnailPaths: [String],
    featured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index to ensure uniqueness across productName, category, subcategory, unit, and quantity
productSchema.index({ productName: 1, unitId: 1, quantity: 1, categoryId: 1, subcategoryId: 1 }, { unique: true });

export const ProductModel = mongoose.model<IProductDocument>('Product', productSchema);
