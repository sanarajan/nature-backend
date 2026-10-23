import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificationDocument extends Document {
    name: string;
    fileUrl: string;
    originalFileName?: string;
    pdfUrl?: string;
    originalPdfName?: string;
    pdfPublicId?: string;
    description?: string;
    certificateImageUrl?: string;
    originalCertificateName?: string;
    certificateImagePublicId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const certificationSchema = new Schema<ICertificationDocument>({
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    originalFileName: { type: String },
    pdfUrl: { type: String },
    originalPdfName: { type: String },
    pdfPublicId: { type: String },
    description: { type: String },
    certificateImageUrl: { type: String },
    originalCertificateName: { type: String },
    certificateImagePublicId: { type: String }
}, { timestamps: true });

export const CertificationModel = mongoose.model<ICertificationDocument>('Certification', certificationSchema);
