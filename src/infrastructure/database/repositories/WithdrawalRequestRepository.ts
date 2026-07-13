import { injectable } from 'tsyringe';
import { IWithdrawalRequestRepository } from '../../../domain/repositories/IWithdrawalRequestRepository';
import { WithdrawalRequestModel } from '../models/WithdrawalRequestModel';

@injectable()
export class WithdrawalRequestRepository implements IWithdrawalRequestRepository {
    async findByInfluencerId(influencerId: string, limit?: number): Promise<any[]> {
        const query = WithdrawalRequestModel.find({ influencerId }).sort({ createdAt: -1 });
        if (limit) query.limit(limit);
        return query.exec();
    }

    async findPendingByInfluencerId(influencerId: string): Promise<any | null> {
        return WithdrawalRequestModel.findOne({ influencerId, status: 'Pending' }).exec();
    }

    async createRequest(data: any): Promise<any> {
        const request = new WithdrawalRequestModel(data);
        return request.save();
    }

    async findAllWithInfluencer(): Promise<any[]> {
        return WithdrawalRequestModel.find()
            .populate({ path: 'influencerId', select: 'displayName email influencerCode influencerWalletBalance' })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByIdWithInfluencer(id: string): Promise<any | null> {
        return WithdrawalRequestModel.findById(id).populate('influencerId').exec();
    }

    async save(request: any): Promise<any> {
        return request.save();
    }
}
