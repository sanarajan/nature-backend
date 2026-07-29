export interface IEmailService {
    sendVerificationEmail(email: string, otp: string): Promise<void>;
    sendWelcomeWithReferralEmail(email: string, referralId: string, offerPercentage: number, joiningDiscount: number): Promise<void>;
    sendShippingEmail(email: string, orderId: string, productName: string, agencyName: string, trackingNumber: string, trackingUrl?: string): Promise<void>;
    sendInfluencerApprovalEmail(email: string, userName: string): Promise<void>;
    sendInfluencerRejectionEmail(email: string, userName: string, reason?: string): Promise<void>;
    sendStaffCredentialsEmail(email: string, name: string, password: string): Promise<void>;
}

