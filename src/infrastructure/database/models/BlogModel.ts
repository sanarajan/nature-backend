import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogDocument extends Document {
    title: string;
    content: string;
    imageUrl: string;
    imagePublicId?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    image?: string;
    description?: string;
}

const blogSchema = new Schema<IBlogDocument>({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret: any) => {
            ret.image = ret.imageUrl;
            ret.description = ret.content;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret: any) => {
            ret.image = ret.imageUrl;
            ret.description = ret.content;
            return ret;
        }
    }
});

blogSchema.virtual('image').get(function (this: IBlogDocument) {
    return this.imageUrl;
});

blogSchema.virtual('description').get(function (this: IBlogDocument) {
    return this.content;
});

export const BlogModel = mongoose.model<IBlogDocument>('Blog', blogSchema);
