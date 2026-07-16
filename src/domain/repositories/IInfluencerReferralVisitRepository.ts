export interface RecordVisitInput {
    influencerId: string;
    influencerCode: string;
    sessionKey: string;
    userId?: string | null;
}

export interface IInfluencerReferralVisitRepository {
    /**
     * Records a referral visit. Uses upsert with $setOnInsert so that
     * duplicate calls for the same (influencerCode, sessionKey) are safely ignored.
     * Returns true if a new record was inserted, false if it was a duplicate.
     */
    recordVisit(data: RecordVisitInput): Promise<boolean>;

    /**
     * Counts all referral visit records for a given influencer by their user ID.
     */
    countByInfluencerId(influencerId: string): Promise<number>;
}
