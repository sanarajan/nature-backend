import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../../constants/enums/UserRole';

export interface IUserDocument extends Document {
    username?: string;
    email?: string;
    displayName?: string;
    password?: string;
    phoneNumber?: string;
    googleId?: string;
    userType: number; // 1 for admin, 2 for regular users
    isActive: boolean;
    verified?: boolean;
    imageUrl?: string;
    address_ids: mongoose.Types.ObjectId[];
    referralId?: string;
    referredBy?: mongoose.Types.ObjectId; // User who referred this user
    role: UserRole; // Keeping for backward compatibility with domain entities
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>({
    username: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, required: false, unique: true, sparse: true },
    displayName: { type: String },
    password: { type: String, required: false },
    phoneNumber: { type: String, required: false, unique: true, sparse: true, default: null },
    googleId: { type: String, unique: true, sparse: true },
    userType: { type: Number, default: 2 }, // 1 for admin, 2 for regular users
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    imageUrl: { type: String, required: false },
    address_ids: [{ type: Schema.Types.ObjectId, ref: 'Address' }],
    referralId: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER } // Keep for backward compatibility
}, { timestamps: true });

// Hash password before saving
userSchema.pre<IUserDocument>('save', function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    next();
});

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
