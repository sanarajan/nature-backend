export interface IGetInfluencerDashboardUseCase {
    execute(userId: string): Promise<any>;
}

export interface IRequestWithdrawalUseCase {
    execute(userId: string, amount: number): Promise<any>;
}

export interface IUpgradeToInfluencerUseCase {
    execute(userId: string): Promise<any>;
}
