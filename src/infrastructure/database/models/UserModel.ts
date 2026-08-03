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
    authProvider?: string;
    userType: number; // 1 for admin, 2 for regular users
    isActive: boolean;
    verified?: boolean;
    imageUrl?: string;
    address_ids: mongoose.Types.ObjectId[];
    referralId?: string;
    referredBy?: mongoose.Types.ObjectId; // User who referred this user
    role: UserRole; // Keeping for backward compatibility with domain entities
    
    // Influencer Specific Fields
    isInfluencer?: boolean;
    influencerCode?: string;
    commissionPercentage?: number;
    influencerWalletBalance?: number;
    influencerWithdrawalHold?: number;
    withdrawalHold?: number;
    influencerPendingBalance?: number;
    influencerTotalEarned?: number;
    influencerTotalWithdrawn?: number;
    influencerReferralVisits?: number;
    influencerStatus?: string;
    
    // Bank Details
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    
    // Influencer Request Fields
    influencerRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    influencerRequestDate?: Date;
    influencerSocialProfiles?: {
        facebook?: string;
        instagram?: string;
        youtube?: string;
    };
    influencerRejectionReason?: string;
    
    // Password Reset Fields
    passwordResetTokenHash?: string | null;
    passwordResetTokenExpiresAt?: Date | null;
    
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
    authProvider: { type: String, default: 'email' },
    userType: { type: Number, default: 2 }, // 1 for admin, 2 for regular users
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    imageUrl: { type: String, required: false },
    address_ids: [{ type: Schema.Types.ObjectId, ref: 'Address' }],
    referralId: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER }, // Keep for backward compatibility
    
    // Influencer Specific Fields
    isInfluencer: { type: Boolean, default: false },
    influencerCode: { type: String, unique: true, sparse: true },
    commissionPercentage: { type: Number, default: 0 },
    influencerWalletBalance: { type: Number, default: 0 },
    influencerWithdrawalHold: { type: Number, default: 0 },
    withdrawalHold: { type: Number, default: 0 },
    influencerPendingBalance: { type: Number, default: 0 },
    influencerTotalEarned: { type: Number, default: 0 },
    influencerTotalWithdrawn: { type: Number, default: 0 },
    influencerReferralVisits: { type: Number, default: 0 },
    influencerStatus: { type: String, enum: ['Active', 'Inactive', 'Blocked', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'REJECTED'], default: 'Active' },
    
    // Bank Details
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    upiId: { type: String, default: '' },
    
    // Influencer Request Fields
    influencerRequestStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: null },
    influencerRequestDate: { type: Date },
    influencerSocialProfiles: {
        facebook: { type: String },
        instagram: { type: String },
        youtube: { type: String }
    },
    influencerRejectionReason: { type: String },

    // Password Reset Fields
    passwordResetTokenHash: { type: String, default: null },
    passwordResetTokenExpiresAt: { type: Date, default: null }
}, { timestamps: true });

// Hash password before saving
userSchema.pre<IUserDocument>('save', function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    next();
});

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
