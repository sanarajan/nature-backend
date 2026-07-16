import { inject, injectable } from 'tsyringe';
import {
    IGetAllInfluencersUseCase,
    IGetInfluencerStatsUseCase,
    IUpdateInfluencerUseCase,
    IGetWithdrawalRequestsUseCase,
    IProcessWithdrawalUseCase,
    IGetInfluencerRequestsUseCase,
    IApproveInfluencerRequestUseCase,
    IRejectInfluencerRequestUseCase,
    IGetInfluencerProductsUseCase,
    IUpdateProductInfluencerDiscountUseCase
} from '../../interfaces/admin/IAdminInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IInfluencerReferralVisitRepository } from '../../../domain/repositories/IInfluencerReferralVisitRepository';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import { processPendingCommissions } from '../../../infrastructure/cron/InfluencerCommissionCron';

@injectable()
export class GetAllInfluencersUseCase implements IGetAllInfluencersUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IInfluencerReferralVisitRepository') private influencerReferralVisitRepository: IInfluencerReferralVisitRepository
    ) {}

    async execute(): Promise<any[]> {
        const influencers = await this.userRepository.findInfluencers();
        return Promise.all(
            influencers.map(async (inf: any) => ({
                ...inf.toObject(),
                referralVisits: await this.influencerReferralVisitRepository.countByInfluencerId(inf._id.toString())
            }))
        );
    }
}

@injectable()
export class GetInfluencerStatsUseCase implements IGetInfluencerStatsUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IOrderRepository') private orderRepository: IOrderRepository,
        @inject('IInfluencerReferralVisitRepository') private influencerReferralVisitRepository: IInfluencerReferralVisitRepository
    ) {}

    async execute(id: string): Promise<any> {
        const influencer = await this.userRepository.findById(id);
        if (!influencer) throw new NotFoundError('Influencer not found');

        try {
            await processPendingCommissions();
        } catch (e) {
            console.error('[GetInfluencerStatsUseCase] processPendingCommissions error:', e);
        }

        const updatedInfluencer = (await this.userRepository.findById(id)) || influencer;
        const analytics = await this.orderRepository.getInfluencerAnalytics(id);
        const recentOrders = await this.orderRepository.findRecentOrdersByInfluencerId(id, 10);
        const completedOrdersList = await this.orderRepository.findCompletedByInfluencerId(id);
        const totalSales = completedOrdersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        const pendingComm = analytics.pendingCommission !== undefined ? analytics.pendingCommission : ((updatedInfluencer as any).influencerPendingBalance || 0);
        const approvedComm = analytics.approvedCommission !== undefined ? analytics.approvedCommission : ((updatedInfluencer as any).influencerTotalEarned || 0);

        if ((updatedInfluencer as any).influencerPendingBalance !== pendingComm || (updatedInfluencer as any).influencerTotalEarned !== approvedComm) {
            (updatedInfluencer as any).influencerPendingBalance = pendingComm;
            (updatedInfluencer as any).influencerTotalEarned = approvedComm;
            await this.userRepository.findByIdAndUpdate(id, {
                influencerPendingBalance: pendingComm,
                influencerTotalEarned: approvedComm
            });
        }

        return {
            influencer: updatedInfluencer,
            referralVisits: await this.influencerReferralVisitRepository.countByInfluencerId(id),
            uniqueCustomers: analytics.uniqueCustomers || 0,
            totalOrders: analytics.totalOrders || 0,
            completedOrders: analytics.completedOrders || 0,
            pendingOrders: analytics.pendingOrders || 0,
            cancelledOrders: analytics.cancelledOrders || 0,
            returnedOrders: analytics.returnedOrders || 0,
            pendingCommission: pendingComm,
            approvedCommission: approvedComm,
            walletBalance: (updatedInfluencer as any).influencerWalletBalance || 0,
            totalSales,
            topProducts: analytics.topProducts || [],
            recentOrders
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
            if (['INACTIVE', 'Inactive', 'BLOCKED', 'Blocked'].includes(influencer.influencerStatus)) {
                throw new ValidationError(`Cannot approve withdrawal for an influencer whose status is ${influencer.influencerStatus}`);
            }
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

@injectable()
export class GetInfluencerRequestsUseCase implements IGetInfluencerRequestsUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(): Promise<any[]> {
        return this.userRepository.findAllInfluencerRequests();
    }
}

@injectable()
export class ApproveInfluencerRequestUseCase implements IApproveInfluencerRequestUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IEmailService') private emailService: IEmailService
    ) {}

    async execute(id: string): Promise<any> {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundError('User not found');

        const baseCode = (user.displayName || user.username || 'INF').substring(0, 4).toUpperCase();
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();
        const influencerCode = user.influencerCode || `${baseCode}${uniqueSuffix}`;

        const updatedUser = await this.userRepository.findByIdAndUpdate(id, {
            influencerRequestStatus: 'APPROVED',
            isInfluencer: true,
            influencerCode: influencerCode,
            commissionPercentage: 5,
            influencerStatus: 'Active',
            influencerWalletBalance: (user as any).influencerWalletBalance || 0,
            influencerPendingBalance: (user as any).influencerPendingBalance || 0,
            influencerTotalEarned: (user as any).influencerTotalEarned || 0,
            influencerTotalWithdrawn: (user as any).influencerTotalWithdrawn || 0
        });

        try {
            if (user.email) {
                const userName = user.displayName || user.username || 'Valued User';
                await this.emailService.sendInfluencerApprovalEmail(user.email, userName);
            }
        } catch (err) {
            console.error('Failed to send approval email:', err);
        }

        return updatedUser;
    }
}

@injectable()
export class RejectInfluencerRequestUseCase implements IRejectInfluencerRequestUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IEmailService') private emailService: IEmailService
    ) {}

    async execute(id: string, reason?: string): Promise<any> {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundError('User not found');

        const updatedUser = await this.userRepository.findByIdAndUpdate(id, {
            influencerRequestStatus: 'REJECTED',
            influencerRejectionReason: reason || 'Does not meet current program requirements',
            isInfluencer: false,
            influencerStatus: 'REJECTED'
        });

        try {
            if (user.email) {
                const userName = user.displayName || user.username || 'Valued User';
                await this.emailService.sendInfluencerRejectionEmail(user.email, userName, reason);
            }
        } catch (err) {
            console.error('Failed to send rejection email:', err);
        }

        return updatedUser;
    }
}

@injectable()
export class GetInfluencerProductsUseCase implements IGetInfluencerProductsUseCase {
    constructor(@inject('IProductRepository') private productRepository: IProductRepository) {}

    async execute(query?: string): Promise<any[]> {
        const filter: any = { isActive: true };
        if (query && query.trim()) {
            filter.$or = [
                { productName: { $regex: new RegExp(query.trim(), 'i') } },
                { sku: { $regex: new RegExp(query.trim(), 'i') } }
            ];
        }
        return this.productRepository.findProducts(filter, 200, { productName: 1 }, ['categoryId', 'unitId']);
    }
}

@injectable()
export class UpdateProductInfluencerDiscountUseCase implements IUpdateProductInfluencerDiscountUseCase {
    constructor(@inject('IProductRepository') private productRepository: IProductRepository) {}

    async execute(productId: string, discount: number | null): Promise<any> {
        const product = await this.productRepository.findById(productId);
        if (!product) throw new NotFoundError('Product not found');

        const val = (discount !== null && discount !== undefined && !isNaN(Number(discount)) && Number(discount) >= 0)
            ? Number(discount)
            : 0;

        const updated = await this.productRepository.updateProduct(productId, { influencerDiscount: val });
        return updated;
    }
}

