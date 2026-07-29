import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase,
    IUpdateBankDetailsUseCase,
    IGetWithdrawalHistoryUseCase,
    IGetWithdrawalDetailsUseCase,
    IGetUserNotificationsUseCase
} from '../../interfaces/user/IInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { IInfluencerReferralVisitRepository } from '../../../domain/repositories/IInfluencerReferralVisitRepository';
import { IInfluencerSettingRepository } from '../../../domain/repositories/IInfluencerSettingRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import { AdminNotificationModel } from '../../../infrastructure/database/models/AdminNotificationModel';
import { UserNotificationModel } from '../../../infrastructure/database/models/UserNotificationModel';
import { processPendingCommissions } from '../../../infrastructure/cron/InfluencerCommissionCron';

@injectable()
export class GetInfluencerDashboardUseCase implements IGetInfluencerDashboardUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IOrderRepository') private orderRepository: IOrderRepository,
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IInfluencerReferralVisitRepository') private influencerReferralVisitRepository: IInfluencerReferralVisitRepository,
        @inject('IInfluencerSettingRepository') private influencerSettingRepository: IInfluencerSettingRepository
    ) {}

    async execute(userId: string): Promise<any> {
        const influencer = await this.userRepository.findById(userId);
        if (!influencer) throw new NotFoundError('User not found');

        if (!influencer.isInfluencer || (influencer.influencerRequestStatus && influencer.influencerRequestStatus !== 'APPROVED')) {
            throw new ValidationError('Influencer dashboard is only accessible after admin approval.');
        }

        try {
            await processPendingCommissions();
        } catch (e) {
            console.error('[GetInfluencerDashboardUseCase] processPendingCommissions error:', e);
        }

        const updatedInfluencer = (await this.userRepository.findById(userId)) || influencer;
        const recentOrders = await this.orderRepository.findRecentOrdersByInfluencerId(userId, 10);
        const withdrawalRequests = await this.withdrawalRequestRepository.findByInfluencerId(userId, 5);
        const analytics = await this.orderRepository.getInfluencerAnalytics(userId);
        const settings = await this.influencerSettingRepository.getSettings();

        const pendingComm = analytics.pendingCommission !== undefined ? analytics.pendingCommission : ((updatedInfluencer as any).influencerPendingBalance || 0);
        const approvedComm = analytics.approvedCommission !== undefined ? analytics.approvedCommission : ((updatedInfluencer as any).influencerTotalEarned || 0);

        if ((updatedInfluencer as any).influencerPendingBalance !== pendingComm || (updatedInfluencer as any).influencerTotalEarned !== approvedComm) {
            (updatedInfluencer as any).influencerPendingBalance = pendingComm;
            (updatedInfluencer as any).influencerTotalEarned = approvedComm;
            await this.userRepository.findByIdAndUpdate(userId, {
                influencerPendingBalance: pendingComm,
                influencerTotalEarned: approvedComm
            });
        }

        const walletBalance = (updatedInfluencer as any).influencerWalletBalance || 0;
        const withdrawalHold = (updatedInfluencer as any).influencerWithdrawalHold || (updatedInfluencer as any).withdrawalHold || 0;
        const minWithdrawalAmount = settings?.minWithdrawalAmount || 500;

        const bankDetails = {
            accountHolderName: (updatedInfluencer as any).accountHolderName || '',
            bankName: (updatedInfluencer as any).bankName || '',
            accountNumber: (updatedInfluencer as any).accountNumber || '',
            ifscCode: (updatedInfluencer as any).ifscCode || '',
            upiId: (updatedInfluencer as any).upiId || ''
        };

        const isBankDetailsComplete = Boolean(
            bankDetails.accountHolderName.trim() &&
            bankDetails.bankName.trim() &&
            bankDetails.accountNumber.trim() &&
            bankDetails.ifscCode.trim()
        );

        return {
            walletBalance,
            withdrawalHold,
            pendingBalance: pendingComm,
            totalEarned: approvedComm,
            totalWithdrawn: (updatedInfluencer as any).influencerTotalWithdrawn || 0,
            referralCode: updatedInfluencer.influencerCode,
            status: (updatedInfluencer as any).influencerStatus || 'Active',
            requestStatus: updatedInfluencer.influencerRequestStatus,
            minWithdrawalAmount,
            bankDetails,
            isBankDetailsComplete,
            referralVisits: await this.influencerReferralVisitRepository.countByInfluencerId(userId),
            uniqueCustomers: analytics.uniqueCustomers || 0,
            totalOrders: analytics.totalOrders || 0,
            completedOrders: analytics.completedOrders || 0,
            pendingOrders: analytics.pendingOrders || 0,
            cancelledOrders: analytics.cancelledOrders || 0,
            returnedOrders: analytics.returnedOrders || 0,
            pendingCommission: pendingComm,
            approvedCommission: approvedComm,
            topProducts: analytics.topProducts || [],
            recentOrders,
            withdrawalRequests
        };
    }
}

@injectable()
export class RequestWithdrawalUseCase implements IRequestWithdrawalUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IInfluencerSettingRepository') private influencerSettingRepository: IInfluencerSettingRepository
    ) {}

    async execute(userId: string, amount: number): Promise<any> {
        if (!amount || amount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        const influencer = await this.userRepository.findById(userId);
        if (!influencer) throw new NotFoundError('User not found');

        if (!influencer.isInfluencer || (influencer.influencerRequestStatus && influencer.influencerRequestStatus !== 'APPROVED')) {
            throw new ValidationError('Withdrawals are only allowed for approved influencers.');
        }

        if (['INACTIVE', 'Inactive'].includes((influencer as any).influencerStatus)) {
            throw new ValidationError('Your influencer account is currently inactive. Withdrawals are disabled.');
        }

        if (['BLOCKED', 'Blocked'].includes((influencer as any).influencerStatus)) {
            throw new ValidationError('Your influencer account has been blocked. Withdrawals are disabled.');
        }

        // Bank Details Check
        const bankHolder = ((influencer as any).accountHolderName || '').trim();
        const bankName = ((influencer as any).bankName || '').trim();
        const accountNumber = ((influencer as any).accountNumber || '').trim();
        const ifscCode = ((influencer as any).ifscCode || '').trim();
        const upiId = ((influencer as any).upiId || '').trim();

        if (!bankHolder || !bankName || !accountNumber || !ifscCode) {
            throw new ValidationError('Please complete your bank details before requesting a withdrawal.');
        }

        // Minimum withdrawal validation
        const settings = await this.influencerSettingRepository.getSettings();
        const minWithdrawal = settings?.minWithdrawalAmount || 500;
        if (amount < minWithdrawal) {
            throw new ValidationError(`Minimum withdrawal amount is ₹${minWithdrawal}`);
        }

        const currentBalance = (influencer as any).influencerWalletBalance || 0;
        if (currentBalance < amount) {
            throw new ValidationError('Insufficient wallet balance');
        }

        const existingPending = await this.withdrawalRequestRepository.findPendingByInfluencerId(userId);
        if (existingPending) {
            throw new ValidationError('You already have a pending withdrawal request');
        }

        // Move funds atomically: Wallet Balance ↓, Withdrawal Hold ↑
        const newBalance = currentBalance - amount;
        const currentHold = (influencer as any).influencerWithdrawalHold || (influencer as any).withdrawalHold || 0;
        const newHold = currentHold + amount;

        await this.userRepository.findByIdAndUpdate(userId, {
            influencerWalletBalance: newBalance,
            influencerWithdrawalHold: newHold,
            withdrawalHold: newHold
        });

        // Create Withdrawal Request with Bank Snapshot
        const request = await this.withdrawalRequestRepository.createRequest({
            influencerId: userId,
            amount,
            status: 'Pending',
            requestedAt: new Date(),
            bankSnapshot: {
                accountHolderName: bankHolder,
                bankName: bankName,
                accountNumber: accountNumber,
                ifscCode: ifscCode,
                upiId: upiId
            }
        });

        // Create User Notification
        try {
            await UserNotificationModel.create({
                userId,
                title: 'Withdrawal Request Submitted',
                message: 'Your withdrawal request has been submitted successfully.\nOur team will review your request shortly.\nPlease wait for approval.',
                type: 'WITHDRAWAL',
                isRead: false,
                metadata: { requestId: request.requestId, amount, status: 'Pending' }
            });
        } catch (e) {
            console.error('Error creating user notification:', e);
        }

        // Create Admin Notification
        try {
            const userName = influencer.displayName || influencer.username || influencer.email || 'Influencer';
            await AdminNotificationModel.create({
                message: `New Withdrawal Request of ₹${amount} from ${userName} (${request.requestId}).`,
                link: '/admin/influencers?tab=withdrawals',
                type: 'WITHDRAWAL_REQUEST',
                isRead: false
            });
        } catch (err) {
            console.error('Error creating admin notification for withdrawal request:', err);
        }

        return request;
    }
}

@injectable()
export class UpdateBankDetailsUseCase implements IUpdateBankDetailsUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(userId: string, bankData: { accountHolderName: string; bankName: string; accountNumber: string; ifscCode: string; upiId?: string }): Promise<any> {
        if (!bankData.accountHolderName || !bankData.accountHolderName.trim()) {
            throw new ValidationError('Account Holder Name is required.');
        }
        if (!bankData.bankName || !bankData.bankName.trim()) {
            throw new ValidationError('Bank Name is required.');
        }
        if (!bankData.accountNumber || !bankData.accountNumber.trim()) {
            throw new ValidationError('Account Number is required.');
        }
        if (!bankData.ifscCode || !bankData.ifscCode.trim()) {
            throw new ValidationError('IFSC Code is required.');
        }

        const updatedUser = await this.userRepository.findByIdAndUpdate(userId, {
            accountHolderName: bankData.accountHolderName.trim(),
            bankName: bankData.bankName.trim(),
            accountNumber: bankData.accountNumber.trim(),
            ifscCode: bankData.ifscCode.trim().toUpperCase(),
            upiId: (bankData.upiId || '').trim()
        });

        return updatedUser;
    }
}

@injectable()
export class GetWithdrawalHistoryUseCase implements IGetWithdrawalHistoryUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository
    ) {}

    async execute(userId: string, page = 1, limit = 10, status?: string): Promise<any> {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || 10);
        const skip = (pageNum - 1) * limitNum;

        const requests = await this.withdrawalRequestRepository.findByInfluencerId(userId, limitNum, skip, status);
        const total = await this.withdrawalRequestRepository.countByInfluencerId(userId, status);

        return {
            requests,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum) || 1
            }
        };
    }
}

@injectable()
export class GetWithdrawalDetailsUseCase implements IGetWithdrawalDetailsUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository
    ) {}

    async execute(userId: string, requestId: string): Promise<any> {
        const request = await this.withdrawalRequestRepository.findByIdWithInfluencer(requestId);
        if (!request) {
            throw new NotFoundError('Withdrawal request not found');
        }

        const infId = request.influencerId?._id ? request.influencerId._id.toString() : request.influencerId.toString();
        if (infId !== userId) {
            throw new ValidationError('Unauthorized to view this withdrawal request.');
        }

        return request;
    }
}

@injectable()
export class GetUserNotificationsUseCase implements IGetUserNotificationsUseCase {
    async execute(userId: string): Promise<any[]> {
        return UserNotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(20).exec();
    }
}

@injectable()
export class UpgradeToInfluencerUseCase implements IUpgradeToInfluencerUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(userId: string, socialProfiles?: { facebook?: string; instagram?: string; youtube?: string }): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        if (user.isInfluencer && (!user.influencerRequestStatus || user.influencerRequestStatus === 'APPROVED')) {
            return { user, message: 'Already an influencer' };
        }

        if (user.influencerRequestStatus === 'PENDING') {
            throw new ValidationError('Your Influencer request is currently under review.');
        }

        if (!socialProfiles || !socialProfiles.facebook || !socialProfiles.instagram || !socialProfiles.youtube) {
            throw new ValidationError('Facebook, Instagram, and YouTube profile URLs are required.');
        }

        const fbRegex = /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9(\.\?)?(_)?\-]+(\/)?.*$/i;
        const igRegex = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_\-\.]+.*$/i;
        const ytRegex = /^https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9_\-\.]+|channel\/[a-zA-Z0-9_\-]+|c\/[a-zA-Z0-9_\-]+|user\/[a-zA-Z0-9_\-]+|.*)/i;

        if (!fbRegex.test(socialProfiles.facebook.trim())) {
            throw new ValidationError('Please enter a valid Facebook profile URL.');
        }
        if (!igRegex.test(socialProfiles.instagram.trim())) {
            throw new ValidationError('Please enter a valid Instagram profile URL.');
        }
        if (!ytRegex.test(socialProfiles.youtube.trim())) {
            throw new ValidationError('Please enter a valid YouTube channel/profile URL.');
        }

        const updatedUser = await this.userRepository.findByIdAndUpdate(userId, {
            influencerRequestStatus: 'PENDING',
            influencerRequestDate: new Date(),
            influencerSocialProfiles: {
                facebook: socialProfiles.facebook.trim(),
                instagram: socialProfiles.instagram.trim(),
                youtube: socialProfiles.youtube.trim()
            }
        });

        try {
            const userName = user.displayName || user.username || user.email || 'User';
            await AdminNotificationModel.create({
                message: `New Influencer request from ${userName} requires review.`,
                link: '/admin/influencers',
                type: 'INFLUENCER_REQUEST',
                isRead: false
            });
        } catch (err) {
            console.error('Error creating admin notification for influencer request:', err);
        }

        return { user: updatedUser, message: 'Your Influencer request has been submitted successfully. Our team will review your request.' };
    }
}
