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

export interface IGetInfluencerRequestsUseCase {
    execute(): Promise<any[]>;
}

export interface IApproveInfluencerRequestUseCase {
    execute(id: string): Promise<any>;
}

export interface IRejectInfluencerRequestUseCase {
    execute(id: string, reason?: string): Promise<any>;
}

export interface IGetInfluencerProductsUseCase {
    execute(query?: string): Promise<any[]>;
}

export interface IUpdateProductInfluencerDiscountUseCase {
    execute(productId: string, discount: number | null): Promise<any>;
}

