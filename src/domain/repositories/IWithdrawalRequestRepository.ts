export interface IWithdrawalRequestRepository {
    findByInfluencerId(influencerId: string, limit?: number): Promise<any[]>;
    findPendingByInfluencerId(influencerId: string): Promise<any | null>;
    createRequest(data: any): Promise<any>;
    findAllWithInfluencer(): Promise<any[]>;
    findByIdWithInfluencer(id: string): Promise<any | null>;
    save(request: any): Promise<any>;
}
