import { injectable } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { UserModel, IUserDocument } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';

@injectable()
export class UserRepository extends BaseRepository<User, IUserDocument> implements IUserRepository {
    constructor() {
        super(UserModel);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ email });
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        return this.findOne({ phoneNumber });
    }

    async findById(id: string): Promise<User | null> {
        const userDoc = await UserModel.findById(id).populate('address_ids').exec();
        return userDoc ? this.mapToEntity(userDoc) : null;
    }

    async findInfluencers(): Promise<any[]> {
        return UserModel.find({
            isInfluencer: true,
            influencerRequestStatus: { $nin: ['PENDING', 'REJECTED'] }
        }).sort({ createdAt: -1 }).exec();
    }

    async findPendingInfluencerRequests(): Promise<any[]> {
        return UserModel.find({ influencerRequestStatus: 'PENDING' }).sort({ influencerRequestDate: -1, createdAt: -1 }).exec();
    }

    async findAllInfluencerRequests(): Promise<any[]> {
        return UserModel.find({ influencerRequestStatus: { $in: ['PENDING', 'APPROVED', 'REJECTED'] } }).sort({ influencerRequestDate: -1, createdAt: -1 }).exec();
    }

    async findByIdAndUpdate(id: string, data: any): Promise<any | null> {
        return UserModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async trackReferralVisit(code: string): Promise<boolean> {
        if (!code) return false;
        const cleanCode = code.trim();
        const result = await UserModel.updateOne(
            { influencerCode: { $regex: new RegExp(`^${cleanCode}$`, 'i') }, isInfluencer: true },
            { $inc: { influencerReferralVisits: 1 } }
        ).exec();
        return result.modifiedCount > 0;
    }

    protected mapToEntity(userDoc: IUserDocument): User {
        return new User(
            userDoc._id.toString(),
            userDoc.email || '',
            userDoc.displayName,
            userDoc.username,
            userDoc.phoneNumber,
            userDoc.password,
            userDoc.role,
            userDoc.verified || false,
            userDoc.imageUrl,
            userDoc.referralId,
            userDoc.referredBy?.toString(),
            (userDoc.address_ids || []).map((addr: any) => ({
                id: addr._id.toString(),
                ...addr.toObject ? addr.toObject() : addr
            })),
            userDoc.createdAt,
            userDoc.updatedAt,
            userDoc.isInfluencer,
            userDoc.influencerCode,
            userDoc.influencerRequestStatus,
            userDoc.influencerRequestDate,
            userDoc.influencerSocialProfiles,
            userDoc.influencerRejectionReason,
            userDoc.influencerStatus,
            userDoc.influencerReferralVisits || 0,
            userDoc.commissionPercentage,
            userDoc.influencerWalletBalance,
            userDoc.influencerWithdrawalHold || userDoc.withdrawalHold || 0,
            userDoc.withdrawalHold || userDoc.influencerWithdrawalHold || 0,
            userDoc.influencerPendingBalance,
            userDoc.influencerTotalEarned,
            userDoc.influencerTotalWithdrawn,
            userDoc.accountHolderName,
            userDoc.bankName,
            userDoc.accountNumber,
            userDoc.ifscCode,
            userDoc.upiId
        );
    }

    protected mapToDocument(user: User): any {
        return {
            email: user.email,
            displayName: user.displayName,
            username: user.username,
            phoneNumber: user.phoneNumber,
            password: user.password,
            role: user.role,
            verified: user.verified,
            imageUrl: user.imageUrl,
            referralId: user.referralId,
            referredBy: user.referredBy,
            isInfluencer: user.isInfluencer,
            influencerCode: user.influencerCode,
            influencerRequestStatus: user.influencerRequestStatus,
            influencerRequestDate: user.influencerRequestDate,
            influencerSocialProfiles: user.influencerSocialProfiles,
            influencerRejectionReason: user.influencerRejectionReason,
            influencerStatus: user.influencerStatus,
            commissionPercentage: user.commissionPercentage,
            influencerWalletBalance: user.influencerWalletBalance,
            influencerWithdrawalHold: user.influencerWithdrawalHold || user.withdrawalHold,
            withdrawalHold: user.withdrawalHold || user.influencerWithdrawalHold,
            influencerPendingBalance: user.influencerPendingBalance,
            influencerTotalEarned: user.influencerTotalEarned,
            influencerTotalWithdrawn: user.influencerTotalWithdrawn,
            accountHolderName: user.accountHolderName,
            bankName: user.bankName,
            accountNumber: user.accountNumber,
            ifscCode: user.ifscCode,
            upiId: user.upiId
        };
    }

    // Override save for custom email-based upsert logic
    async save(user: User): Promise<User> {
        let query: any = {};
        if (user.id) {
            query = { _id: user.id };
        } else if (user.email) {
            query = { email: user.email };
        } else if (user.phoneNumber) {
            query = { phoneNumber: user.phoneNumber };
        }

        const userDoc = await UserModel.findOneAndUpdate(
            query,
            this.mapToDocument(user),
            { upsert: true, new: true }
        );
        return this.mapToEntity(userDoc);
    }
}
