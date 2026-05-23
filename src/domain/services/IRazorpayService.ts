export interface IRazorpayService {
    createOrder(amount: number, receipt: string): Promise<any>;
    verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean;
    fetchPayment(paymentId: string): Promise<any>;
}
