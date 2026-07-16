import { injectable } from 'tsyringe';
import mongoose from 'mongoose';
import {
    IInfluencerReferralVisitRepository,
    RecordVisitInput
} from '../../../domain/repositories/IInfluencerReferralVisitRepository';
import { InfluencerReferralVisitModel } from '../models/InfluencerReferralVisitModel';

@injectable()
export class InfluencerReferralVisitRepository implements IInfluencerReferralVisitRepository {
    /**
     * Upserts a referral visit record.
     * The compound unique index on { influencerCode, sessionKey } guarantees
     * that at most one document exists per (influencer, session).
     * $setOnInsert ensures no fields are overwritten on a duplicate attempt.
     */
    async recordVisit(data: RecordVisitInput): Promise<boolean> {
        const filter = {
            influencerCode: data.influencerCode,
            sessionKey: data.sessionKey
        };

        const insertDoc: any = {
            influencerId: new mongoose.Types.ObjectId(data.influencerId),
            influencerCode: data.influencerCode,
            sessionKey: data.sessionKey,
            userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : null,
            visitedAt: new Date()
        };

        try {
            const result = await InfluencerReferralVisitModel.updateOne(
                filter,
                { $setOnInsert: insertDoc },
                { upsert: true }
            ).exec();

            // upsertedCount > 0 means a new document was inserted (not a duplicate)
            return (result.upsertedCount ?? 0) > 0;
        } catch (err: any) {
            // Duplicate key error (code 11000) — silently treat as success (already recorded)
            if (err?.code === 11000) {
                return false;
            }
            throw err;
        }
    }

    async countByInfluencerId(influencerId: string): Promise<number> {
        if (!influencerId || !mongoose.Types.ObjectId.isValid(influencerId)) return 0;
        return InfluencerReferralVisitModel.countDocuments({
            influencerId: new mongoose.Types.ObjectId(influencerId)
        }).exec();
    }
}
