export interface IWithdrawalRequestRepository {
    findByInfluencerId(influencerId: string, limit?: number, skip?: number, status?: string): Promise<any[]>;
    countByInfluencerId(influencerId: string, status?: string): Promise<number>;
    findPendingByInfluencerId(influencerId: string): Promise<any | null>;
    createRequest(data: any): Promise<any>;
    findAllWithInfluencer(filter?: any, limit?: number, skip?: number, sort?: any): Promise<any[]>;
    countAllWithInfluencer(filter?: any): Promise<number>;
    findByIdWithInfluencer(id: string): Promise<any | null>;
    findById(id: string): Promise<any | null>;
    save(request: any): Promise<any>;
}
