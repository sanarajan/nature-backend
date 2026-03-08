import mongoose, { Schema, Document } from 'mongoose';

export interface IUserOTPVerificationDocument extends Document {
    email: string;
    otp: string;
    createdAt: Date;
}

const userOTPVerificationSchema = new Schema<IUserOTPVerificationDocument>({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }
});

export const UserOTPVerificationModel = mongoose.model<IUserOTPVerificationDocument>('userOTPVerification', userOTPVerificationSchema);
