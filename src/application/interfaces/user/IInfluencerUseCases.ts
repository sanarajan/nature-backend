export interface IGetInfluencerDashboardUseCase {
    execute(userId: string): Promise<any>;
}

export interface IRequestWithdrawalUseCase {
    execute(userId: string, amount: number): Promise<any>;
}

export interface IUpgradeToInfluencerUseCase {
    execute(userId: string, socialProfiles?: { facebook?: string; instagram?: string; youtube?: string }): Promise<any>;
}

export interface ITrackReferralVisitUseCase {
    execute(code: string, sessionId: string, userId?: string | null): Promise<boolean>;
}
