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

export interface IUpdateBankDetailsUseCase {
    execute(userId: string, bankData: { accountHolderName: string; bankName: string; accountNumber: string; ifscCode: string; upiId?: string }): Promise<any>;
}

export interface IGetWithdrawalHistoryUseCase {
    execute(userId: string, page?: number, limit?: number, status?: string): Promise<any>;
}

export interface IGetWithdrawalDetailsUseCase {
    execute(userId: string, requestId: string): Promise<any>;
}

export interface IGetUserNotificationsUseCase {
    execute(userId: string): Promise<any[]>;
}
