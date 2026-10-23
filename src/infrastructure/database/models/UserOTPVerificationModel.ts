import mongoose, { Schema, Document } from 'mongoose';

export interface IUserOTPVerificationDocument extends Document {
    email: string;
    otp: string;
    createdAt: Date;
    expiresAt: Date;
    resendCount: number;
    lastResentAt: Date;
    attempts: number;
}

const userOTPVerificationSchema = new Schema<IUserOTPVerificationDocument>({
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
    expiresAt: { type: Date, required: true },
    resendCount: { type: Number, default: 0 },
    lastResentAt: { type: Date, default: Date.now },
    attempts: { type: Number, default: 0 }
});

export const UserOTPVerificationModel = mongoose.model<IUserOTPVerificationDocument>('userOTPVerification', userOTPVerificationSchema);
