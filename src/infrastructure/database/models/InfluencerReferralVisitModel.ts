import mongoose, { Schema, Document } from 'mongoose';

export interface IInfluencerReferralVisitDocument extends Document {
    influencerId: mongoose.Types.ObjectId;
    influencerCode: string;
    /**
     * sessionKey is a sha256 hash of (influencerCode + ':' + sessionId).
     * It is used as the deduplication key. No raw IP or personal data is stored.
     */
    sessionKey: string;
    userId?: mongoose.Types.ObjectId;
    visitedAt: Date;
}

const influencerReferralVisitSchema = new Schema<IInfluencerReferralVisitDocument>(
    {
        influencerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        influencerCode: { type: String, required: true, index: true },
        sessionKey: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        visitedAt: { type: Date, default: Date.now, index: true }
    },
    { timestamps: false, collection: 'influencerReferralVisits' }
);

// Compound unique index — prevents duplicate records for the same influencer + session
influencerReferralVisitSchema.index({ influencerCode: 1, sessionKey: 1 }, { unique: true });

export const InfluencerReferralVisitModel = mongoose.model<IInfluencerReferralVisitDocument>(
    'InfluencerReferralVisit',
    influencerReferralVisitSchema
);
