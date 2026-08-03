export interface ISpinWheelRepository {
    getSettings(): Promise<any>;
    updateSettings(data: any): Promise<any>;
    
    getSegments(onlyActive?: boolean): Promise<any[]>;
    getSegmentById(id: string): Promise<any | null>;
    createSegment(data: any): Promise<any>;
    updateSegment(id: string, data: any): Promise<any | null>;
    deleteSegment(id: string): Promise<any | null>;
    reorderSegments(orders: { id: string; order: number }[]): Promise<boolean>;

    getLastSpinForUser(userId: string): Promise<any | null>;
    recordSpin(data: any): Promise<any>;
    getUserSpinHistory(userId: string): Promise<any[]>;

    getReportStats(): Promise<{
        totalSpins: number;
        todaySpins: number;
        couponsGenerated: number;
        couponsRedeemed: number;
        couponsExpired: number;
        mostWonReward: string;
    }>;
}
