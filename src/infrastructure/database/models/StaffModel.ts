import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffDocument extends Document {
    name: string;
    email: string;
    phone: string;
    profilePhoto: string | null;
    password: string;
    status: 'ACTIVE' | 'BLOCKED';
    isBlocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const staffSchema = new Schema<IStaffDocument>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },
    profilePhoto: { type: String, default: null },
    password: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
    isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

export const StaffModel = mongoose.model<IStaffDocument>('Staff', staffSchema);
