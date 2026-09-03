import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificationDocument extends Document {
    name: string;
    fileUrl: string;
    originalFileName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const certificationSchema = new Schema<ICertificationDocument>({
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    originalFileName: { type: String }
}, { timestamps: true });

export const CertificationModel = mongoose.model<ICertificationDocument>('Certification', certificationSchema);
