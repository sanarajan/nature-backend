import { inject, injectable } from 'tsyringe';
import {
    IGetInfluencerDashboardUseCase,
    IRequestWithdrawalUseCase,
    IUpgradeToInfluencerUseCase
} from '../../interfaces/user/IInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';

@injectable()
export class GetInfluencerDashboardUseCase implements IGetInfluencerDashboardUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IOrderRepository') private orderRepository: IOrderRepository,
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository
    ) {}

    async execute(userId: string): Promise<any> {
        const influencer = await this.userRepository.findById(userId);
        if (!influencer) throw new NotFoundError('User not found');

        const recentOrders = await this.orderRepository.findRecentOrdersByInfluencerId(userId, 10);
        const withdrawalRequests = await this.withdrawalRequestRepository.findByInfluencerId(userId, 5);

        return {
            walletBalance: (influencer as any).influencerWalletBalance || 0,
            pendingBalance: (influencer as any).influencerPendingBalance || 0,
            totalEarned: (influencer as any).influencerTotalEarned || 0,
            totalWithdrawn: (influencer as any).influencerTotalWithdrawn || 0,
            referralCode: influencer.influencerCode,
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

    async execute(userId: string): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        if (user.isInfluencer) {
            return { user, message: 'Already an influencer' };
        }

        const baseCode = (user.displayName || user.username || 'INF').substring(0, 4).toUpperCase();
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();
        const influencerCode = `${baseCode}${uniqueSuffix}`;

        const updatedUser = await this.userRepository.findByIdAndUpdate(userId, {
            isInfluencer: true,
            influencerCode: influencerCode,
            commissionPercentage: 5,
            influencerStatus: 'Active',
            influencerWalletBalance: 0,
            influencerPendingBalance: 0,
            influencerTotalEarned: 0,
            influencerTotalWithdrawn: 0
        });

        return { user: updatedUser, message: 'Upgraded to influencer successfully' };
    }
}
