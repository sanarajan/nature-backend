export interface IGetAllInfluencersUseCase {
    execute(): Promise<any[]>;
}

export interface IGetInfluencerStatsUseCase {
    execute(id: string): Promise<any>;
}

export interface IUpdateInfluencerUseCase {
    execute(id: string, data: any): Promise<any>;
}

export interface IGetWithdrawalRequestsUseCase {
    execute(): Promise<any[]>;
}

export interface IProcessWithdrawalUseCase {
    execute(id: string, status: string, remarks: string): Promise<any>;
}
