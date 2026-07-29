import { inject, injectable } from 'tsyringe';
import {
    IGetAllInfluencersUseCase,
    IGetInfluencerStatsUseCase,
    IUpdateInfluencerUseCase,
    IGetWithdrawalRequestsUseCase,
    IProcessWithdrawalUseCase,
    IApproveWithdrawalUseCase,
    IRejectWithdrawalUseCase,
    IMarkWithdrawalPaidUseCase,
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
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(query: { search?: string; status?: string; page?: number; limit?: number } = {}): Promise<any> {
        const pageNum = Math.max(1, Number(query.page) || 1);
        const limitNum = Math.max(1, Number(query.limit) || 10);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};
        if (query.status && query.status !== 'ALL' && query.status !== 'All') {
            filter.status = query.status;
        }

        if (query.search && query.search.trim()) {
            const searchTerm = query.search.trim();
            const searchRegex = new RegExp(searchTerm, 'i');

            // Find matching influencers by name or email
            const matchedUsers = await (this.userRepository as any).findInfluencers();
            const matchingUserIds = matchedUsers
                .filter((u: any) => searchRegex.test(u.displayName || '') || searchRegex.test(u.username || '') || searchRegex.test(u.email || ''))
                .map((u: any) => u._id);

            filter.$or = [
                { requestId: searchRegex },
                { influencerId: { $in: matchingUserIds } }
            ];
        }

        const requests = await this.withdrawalRequestRepository.findAllWithInfluencer(filter, limitNum, skip, { createdAt: -1 });
        const total = await this.withdrawalRequestRepository.countAllWithInfluencer(filter);

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
export class ApproveWithdrawalUseCase implements IApproveWithdrawalUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository
    ) {}

    async execute(id: string, remarks?: string): Promise<any> {
        const request = await this.withdrawalRequestRepository.findByIdWithInfluencer(id);
        if (!request) throw new NotFoundError('Withdrawal request not found');
        if (request.status !== 'Pending') {
            throw new ValidationError(`Cannot approve request with status '${request.status}'`);
        }

        request.status = 'Approved';
        request.approvedAt = new Date();
        if (remarks) {
            request.adminRemarks = remarks;
            request.remarks = remarks;
        }
        await this.withdrawalRequestRepository.save(request);

        // User Notification
        try {
            const infId = request.influencerId?._id || request.influencerId;
            const { UserNotificationModel } = await import('../../../infrastructure/database/models/UserNotificationModel.js');
            await UserNotificationModel.create({
                userId: infId,
                title: 'Withdrawal Request Approved',
                message: 'Good news!\nYour withdrawal request has been approved.\nOur finance team will manually transfer the payment to your registered bank account.\nYou will receive another update once the payment has been completed.',
                type: 'WITHDRAWAL',
                isRead: false,
                metadata: { requestId: request.requestId, amount: request.amount, status: 'Approved' }
            });
        } catch (e) {
            console.error('Error sending user approval notification:', e);
        }

        return request;
    }
}

@injectable()
export class RejectWithdrawalUseCase implements IRejectWithdrawalUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(id: string, reason: string): Promise<any> {
        if (!reason || !reason.trim()) {
            throw new ValidationError('Rejection reason is mandatory.');
        }

        const request = await this.withdrawalRequestRepository.findByIdWithInfluencer(id);
        if (!request) throw new NotFoundError('Withdrawal request not found');
        if (['Paid', 'Rejected'].includes(request.status)) {
            throw new ValidationError(`Cannot reject request already in status '${request.status}'`);
        }

        const infId = request.influencerId?._id ? request.influencerId._id.toString() : request.influencerId.toString();

        // Move funds back from Withdrawal Hold to Wallet Balance
        const user = await this.userRepository.findById(infId);
        if (user) {
            const currentWallet = (user as any).influencerWalletBalance || 0;
            const currentHold = (user as any).influencerWithdrawalHold || (user as any).withdrawalHold || 0;

            const newWallet = currentWallet + request.amount;
            const newHold = Math.max(0, currentHold - request.amount);

            await this.userRepository.findByIdAndUpdate(infId, {
                influencerWalletBalance: newWallet,
                influencerWithdrawalHold: newHold,
                withdrawalHold: newHold
            });
        }

        request.status = 'Rejected';
        request.rejectedAt = new Date();
        request.reason = reason.trim();
        request.adminRemarks = reason.trim();
        await this.withdrawalRequestRepository.save(request);

        // User Notification
        try {
            const { UserNotificationModel } = await import('../../../infrastructure/database/models/UserNotificationModel.js');
            await UserNotificationModel.create({
                userId: infId,
                title: 'Withdrawal Request Rejected',
                message: `Unfortunately your withdrawal request has been rejected.\nReason:\n${reason.trim()}\nPlease update your bank details or resolve the issue and submit a new withdrawal request.`,
                type: 'WITHDRAWAL',
                isRead: false,
                metadata: { requestId: request.requestId, amount: request.amount, status: 'Rejected', reason: reason.trim() }
            });
        } catch (e) {
            console.error('Error sending user rejection notification:', e);
        }

        return request;
    }
}

@injectable()
export class MarkWithdrawalPaidUseCase implements IMarkWithdrawalPaidUseCase {
    constructor(
        @inject('IWithdrawalRequestRepository') private withdrawalRequestRepository: IWithdrawalRequestRepository,
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(id: string, transactionReference?: string, remarks?: string): Promise<any> {
        const request = await this.withdrawalRequestRepository.findByIdWithInfluencer(id);
        if (!request) throw new NotFoundError('Withdrawal request not found');
        if (request.status === 'Paid') {
            throw new ValidationError('Withdrawal request has already been marked as Paid.');
        }

        const infId = request.influencerId?._id ? request.influencerId._id.toString() : request.influencerId.toString();

        // Move funds: Withdrawal Hold -> 0, Total Withdrawn ↑
        const user = await this.userRepository.findById(infId);
        if (user) {
            const currentHold = (user as any).influencerWithdrawalHold || (user as any).withdrawalHold || 0;
            const currentWithdrawn = (user as any).influencerTotalWithdrawn || 0;

            const newHold = Math.max(0, currentHold - request.amount);
            const newWithdrawn = currentWithdrawn + request.amount;

            await this.userRepository.findByIdAndUpdate(infId, {
                influencerWithdrawalHold: newHold,
                withdrawalHold: newHold,
                influencerTotalWithdrawn: newWithdrawn
            });
        }

        request.status = 'Paid';
        request.paidAt = new Date();
        if (transactionReference) request.transactionReference = transactionReference.trim();
        if (remarks) {
            request.remarks = remarks.trim();
            request.adminRemarks = remarks.trim();
        }
        await this.withdrawalRequestRepository.save(request);

        // User Notification
        try {
            const { UserNotificationModel } = await import('../../../infrastructure/database/models/UserNotificationModel.js');
            await UserNotificationModel.create({
                userId: infId,
                title: 'Withdrawal Completed',
                message: 'Congratulations!\nYour withdrawal request has been successfully completed.\nThe payment has been transferred to your registered bank account.\nThank you.',
                type: 'WITHDRAWAL',
                isRead: false,
                metadata: { requestId: request.requestId, amount: request.amount, status: 'Paid', transactionReference: transactionReference?.trim() }
            });
        } catch (e) {
            console.error('Error sending user paid notification:', e);
        }

        return request;
    }
}

@injectable()
export class ProcessWithdrawalUseCase implements IProcessWithdrawalUseCase {
    constructor(
        @inject('IApproveWithdrawalUseCase') private approveUseCase: IApproveWithdrawalUseCase,
        @inject('IRejectWithdrawalUseCase') private rejectUseCase: IRejectWithdrawalUseCase,
        @inject('IMarkWithdrawalPaidUseCase') private markPaidUseCase: IMarkWithdrawalPaidUseCase
    ) {}

    async execute(id: string, status: string, remarks?: string, reason?: string, transactionReference?: string): Promise<any> {
        if (status === 'Approved') {
            return this.approveUseCase.execute(id, remarks);
        } else if (status === 'Rejected') {
            return this.rejectUseCase.execute(id, reason || remarks || 'Rejected by Admin');
        } else if (status === 'Paid') {
            return this.markPaidUseCase.execute(id, transactionReference, remarks);
        } else {
            throw new ValidationError(`Invalid withdrawal status transition '${status}'`);
        }
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

