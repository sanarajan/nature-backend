export interface IOrderRepository {
    findRecentOrdersByInfluencerId(influencerId: string, limit?: number): Promise<any[]>;
    countByInfluencerId(influencerId: string): Promise<number>;
    findCompletedByInfluencerId(influencerId: string): Promise<any[]>;
    getInfluencerAnalytics(influencerId: string): Promise<any>;
    createOrder(data: any): Promise<any>;
    findOrderById(id: string): Promise<any>;
    findOrderByIdAndUserId(id: string, userId: string): Promise<any>;
    findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<any>;
    findOrderByRazorpayPaymentId(razorpayPaymentId: string): Promise<any>;
    findPendingOrderForUser(userId: string, targetPaymentMethod: string): Promise<any>;
    findAllOrders(): Promise<any[]>;
    findOrdersByUserId(userId: string): Promise<any[]>;
    updateOrder(id: string, data: any): Promise<any>;
}
