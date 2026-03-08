import mongoose, { Schema, Document } from 'mongoose';

export interface ICartProduct {
    product: mongoose.Types.ObjectId;
    quantity: number;
}

export interface ICartDocument extends Document {
    user: mongoose.Types.ObjectId;
    products: ICartProduct[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const cartSchema = new Schema<ICartDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const CartModel = mongoose.model<ICartDocument>('Cart', cartSchema);
