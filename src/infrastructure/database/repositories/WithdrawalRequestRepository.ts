import { injectable } from 'tsyringe';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { WithdrawalRequestModel } from '../models/WithdrawalRequestModel';

@injectable()
export class WithdrawalRequestRepository implements IWithdrawalRequestRepository {
    private generateRequestId(): string {
        const timestamp = Date.now().toString().slice(-6);
        const randomDigits = Math.floor(100 + Math.random() * 900);
        return `WR-${timestamp}${randomDigits}`;
    }

    async findByInfluencerId(influencerId: string, limit?: number, skip?: number, status?: string): Promise<any[]> {
        const filter: any = { influencerId };
        if (status && status !== 'ALL' && status !== 'All') {
            filter.status = status;
        }
        const query = WithdrawalRequestModel.find(filter).sort({ createdAt: -1 });
        if (skip && skip > 0) query.skip(skip);
        if (limit && limit > 0) query.limit(limit);
        return query.exec();
    }

    async countByInfluencerId(influencerId: string, status?: string): Promise<number> {
        const filter: any = { influencerId };
        if (status && status !== 'ALL' && status !== 'All') {
            filter.status = status;
        }
        return WithdrawalRequestModel.countDocuments(filter).exec();
    }

    async findPendingByInfluencerId(influencerId: string): Promise<any | null> {
        return WithdrawalRequestModel.findOne({ influencerId, status: 'Pending' }).exec();
    }

    async createRequest(data: any): Promise<any> {
        if (!data.requestId) {
            data.requestId = this.generateRequestId();
        }
        const request = new WithdrawalRequestModel(data);
        return request.save();
    }

    async findAllWithInfluencer(filter: any = {}, limit?: number, skip?: number, sort: any = { createdAt: -1 }): Promise<any[]> {
        const query = WithdrawalRequestModel.find(filter)
            .populate({ path: 'influencerId', select: 'displayName username email phoneNumber influencerCode influencerWalletBalance influencerWithdrawalHold' })
            .sort(sort);
        if (skip && skip > 0) query.skip(skip);
        if (limit && limit > 0) query.limit(limit);
        return query.exec();
    }

    async countAllWithInfluencer(filter: any = {}): Promise<number> {
        return WithdrawalRequestModel.countDocuments(filter).exec();
    }

    async findByIdWithInfluencer(id: string): Promise<any | null> {
        if (id.startsWith('WR-')) {
            return WithdrawalRequestModel.findOne({ requestId: id }).populate('influencerId').exec();
        }
        return WithdrawalRequestModel.findById(id).populate('influencerId').exec();
    }

    async findById(id: string): Promise<any | null> {
        if (id.startsWith('WR-')) {
            return WithdrawalRequestModel.findOne({ requestId: id }).exec();
        }
        return WithdrawalRequestModel.findById(id).exec();
    }

    async save(request: any): Promise<any> {
        return request.save();
    }
}
