import { inject, injectable } from 'tsyringe';
import {
    IGetAllInfluencersUseCase,
    IGetInfluencerStatsUseCase,
    IUpdateInfluencerUseCase,
    IGetWithdrawalRequestsUseCase,
    IProcessWithdrawalUseCase
} from '../../interfaces/admin/IAdminInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';

@injectable()
export class GetAllInfluencersUseCase implements IGetAllInfluencersUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(): Promise<any[]> {
        return this.userRepository.findInfluencers();
    }
}

@injectable()
export class GetInfluencerStatsUseCase implements IGetInfluencerStatsUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IOrderRepository') private orderRepository: IOrderRepository
    ) {}

    async execute(id: string): Promise<any> {
        const influencer = await this.userRepository.findById(id);
        if (!influencer) throw new NotFoundError('Influencer not found');

        const totalOrders = await this.orderRepository.countByInfluencerId(id);
        const completedOrders = await this.orderRepository.findCompletedByInfluencerId(id);
        
        const totalSales = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        return {
            influencer,
            totalOrders,
            totalSales
        };
    }
}

@injectable()
export class UpdateInfluencerUseCase implements IUpdateInfluencerUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(id: string, data: any): Promise<any> {
        const influencer = await this.userRepository.findByIdAndUpdate(id, data);
        if (!influencer) throw new NotFoundError('Influencer not found');
        return influencer;
    }
}

@injectable()
export class GetWithdrawalRequestsUseCase implements IGetWithdrawalRequestsUseCase {
    constructor(@inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository) {}

    async execute(): Promise<any[]> {
        return this.withdrawalRequestRepository.findAllWithInfluencer();
    }
}

@injectable()
export class ProcessWithdrawalUseCase implements IProcessWithdrawalUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(id: string, status: string, remarks: string): Promise<any> {
        const request = await this.withdrawalRequestRepository.findByIdWithInfluencer(id);
        if (!request) throw new NotFoundError('Request not found');
        if (request.status !== 'Pending') throw new ValidationError('Already processed');

        const influencer: any = request.influencerId; // This is populated

        if (status === 'Approved') {
            if (influencer.influencerWalletBalance < request.amount) {
                throw new ValidationError('Insufficient wallet balance');
            }
            influencer.influencerWalletBalance -= request.amount;
            influencer.influencerTotalWithdrawn = (influencer.influencerTotalWithdrawn || 0) + request.amount;
            await this.userRepository.save(influencer); // Using existing save method from repository
        }

        request.status = status;
        request.adminRemarks = remarks;
        request.processedAt = new Date();
        await this.withdrawalRequestRepository.save(request);

        return request;
    }
}
