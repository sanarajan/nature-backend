export interface IEmailService {
    sendVerificationEmail(email: string, otp: string): Promise<void>;
    sendWelcomeWithReferralEmail(email: string, referralId: string, offerPercentage: number, joiningDiscount: number): Promise<void>;
    sendShippingEmail(email: string, orderId: string, productName: string, agencyName: string, trackingNumber: string, trackingUrl?: string): Promise<void>;
    sendInfluencerApprovalEmail(email: string, userName: string): Promise<void>;
    sendInfluencerRejectionEmail(email: string, userName: string, reason?: string): Promise<void>;
    sendStaffCredentialsEmail(email: string, name: string, password: string): Promise<void>;
    sendForgotPasswordEmail(email: string, token: string): Promise<void>;
    sendContactEmail(name: string, email: string, preference: string, message: string): Promise<void>;
    sendOrderConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        orderDate?: Date;
        items: Array<{ productName: string; quantity?: number; price?: number }>;
        totalAmount: number;
        shippingAddress: {
            house?: string;
            place?: string;
            city?: string;
            district?: string;
            state?: string;
            pincode?: number;
        };
        deliveryEstimate?: string;
        paymentMethod?: string;
    }): Promise<void>;
    sendDeliveryConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
    }): Promise<void>;
    sendOrderCancellationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
        reason?: string;
        refundInfo?: string;
    }): Promise<void>;
    sendReturnRefundConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
        refundAmount: number;
        paymentMethod: string;
        transactionReference?: string;
    }): Promise<void>;

   
sendCancellationApprovedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
}): Promise<void>;

sendReturnConfirmedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
}): Promise<void>;

sendPaymentRefundedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
    refundAmount: number;
    paymentMethod: string;
    transactionReference?: string;
}): Promise<void>;

}


