export interface IWhatsAppService {
    sendVerificationOTP(
        phoneNumber: string,
        otp: string
    ): Promise<void>;

     
sendWelcomeComboOffer(
    phoneNumber: string,
    // customerName: string,
    comboName: string,
    comboImageUrl: string,
    comboUrl: string
): Promise<void>;

sendOrderConfirmation(
    phoneNumber: string,
    customerName: string,
    orderId: string,
    totalAmount: number,
    orderUrl: string
): Promise<void>;


sendOrderDelivered(
    phoneNumber: string,
    customerName: string,
    orderId: string,
    orderUrl: string
): Promise<void>;

sendProductShipped(
    phoneNumber: string,
    customerName: string,
    productName: string,
    orderId: string,
    trackingUrl: string
): Promise<void>;



}