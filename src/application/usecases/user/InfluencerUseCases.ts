import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase
} from '../../interfaces/user/IInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { IInfluencerReferralVisitRepository } from '../../../domain/repositories/IInfluencerReferralVisitRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import { AdminNotificationModel } from '../../../infrastructure/database/models/AdminNotificationModel';
import { processPendingCommissions } from '../../../infrastructure/cron/InfluencerCommissionCron';

@injectable()
export class GetInfluencerDashboardUseCase implements IGetInfluencerDashboardUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IOrderRepository') private orderRepository: IOrderRepository,
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IInfluencerReferralVisitRepository') private influencerReferralVisitRepository: IInfluencerReferralVisitRepository
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

        return {
            walletBalance: (updatedInfluencer as any).influencerWalletBalance || 0,
            pendingBalance: pendingComm,
            totalEarned: approvedComm,
            totalWithdrawn: (updatedInfluencer as any).influencerTotalWithdrawn || 0,
            referralCode: updatedInfluencer.influencerCode,
            status: (updatedInfluencer as any).influencerStatus || 'Active',
            requestStatus: updatedInfluencer.influencerRequestStatus,
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
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository
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

        if (((influencer as any).influencerWalletBalance || 0) < amount) {
            throw new ValidationError('Insufficient wallet balance');
        }

        const existingPending = await this.withdrawalRequestRepository.findPendingByInfluencerId(userId);
        if (existingPending) {
            throw new ValidationError('You already have a pending withdrawal request');
        }

        const request = await this.withdrawalRequestRepository.createRequest({
            influencerId: userId,
            amount
        });

        return request;
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
