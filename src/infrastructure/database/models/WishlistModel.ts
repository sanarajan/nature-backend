import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistDocument extends Document {
    user: mongoose.Types.ObjectId;
    products: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlistDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    products: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: true });

export const WishlistModel = mongoose.model<IWishlistDocument>('Wishlist', wishlistSchema);
