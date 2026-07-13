import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import {
    PlaceOrderUseCase,
    VerifyPaymentUseCase,
    HandleRazorpayWebhookUseCase,
    GetUserOrdersUseCase,
    GetUserOrderDetailsUseCase,
    RequestCancellationUseCase,
    RequestItemCancellationUseCase,
    RequestReturnUseCase,
    RequestItemReturnUseCase,
    GetShippingChargeUseCase
} from '../../application/usecases/catalog/UserOrderUseCases';
import { CalculateCheckoutTotalsUseCase } from '../../application/usecases/catalog/CalculateCheckoutTotalsUseCase';

@injectable()
export class UserOrderController {
    constructor(
        @inject('IPlaceOrderUseCase') private placeOrderUseCase: PlaceOrderUseCase,
        @inject('IVerifyPaymentUseCase') private verifyPaymentUseCase: VerifyPaymentUseCase,
        @inject('IHandleRazorpayWebhookUseCase') private handleRazorpayWebhookUseCase: HandleRazorpayWebhookUseCase,
        @inject('IGetUserOrdersUseCase') private getUserOrdersUseCase: GetUserOrdersUseCase,
        @inject('IGetUserOrderDetailsUseCase') private getUserOrderDetailsUseCase: GetUserOrderDetailsUseCase,
        @inject('IRequestCancellationUseCase') private requestCancellationUseCase: RequestCancellationUseCase,
        @inject('IRequestItemCancellationUseCase') private requestItemCancellationUseCase: RequestItemCancellationUseCase,
        @inject('IRequestReturnUseCase') private requestReturnUseCase: RequestReturnUseCase,
        @inject('IRequestItemReturnUseCase') private requestItemReturnUseCase: RequestItemReturnUseCase,
        @inject('IGetShippingChargeUseCase') private getShippingChargeUseCase: GetShippingChargeUseCase,
        @inject('ICalculateCheckoutTotalsUseCase') private calculateCheckoutTotalsUseCase: CalculateCheckoutTotalsUseCase
    ) { }

    public async calculateCheckoutTotals(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log("Checkout API calculateCheckoutTotals req.cookies: ", req.cookies);
            const userId = (req as any).user.id;
            const result = await this.calculateCheckoutTotalsUseCase.execute(userId, req.body, req.cookies);
            res.status(200).json({
                success: true,
                message: 'Checkout totals calculated successfully',
                data: result
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log("Order Preview API placeOrder req.cookies: ", req.cookies);
            const userId = (req as any).user.id;
            const result = await this.placeOrderUseCase.execute(userId, req.body, req.cookies);

            res.status(200).json({
                success: true,
                message: result.isOnline ? (result.useExistingOrder ? 'Payment initiated (Retry)' : 'Payment initiated') : 'Order placed successfully',
                data: {
                    order: result.order,
                    razorpayOrderId: result.order.razorpayOrderId,
                    amount: Math.round(result.totalAmount * 100),
                    key_id: process.env.RAZORPAY_KEY_ID
                }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const order = await this.verifyPaymentUseCase.execute(req.body);
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                orderId: order.orderId,
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.handleRazorpayWebhookUseCase.execute(req.headers, req.body, JSON.stringify(req.body));
            res.status(200).json({ status: 'ok' });
        } catch (error: any) {
            console.error('Webhook Error:', error);
            res.status(500).json({ status: 'error' });
        }
    }

    public async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orders = await this.getUserOrdersUseCase.execute(userId);

            res.status(200).json({
                success: true,
                data: { orders }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id as string;

            const order = await this.getUserOrderDetailsUseCase.execute(orderId, userId);

            res.status(200).json({
                success: true,
                data: { order }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async requestCancellation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id as string;
            const { reason, remarks } = req.body;

            const order = await this.requestCancellationUseCase.execute(userId, orderId, reason, remarks);

            res.status(200).json({
                success: true,
                message: 'Cancellation requested safely. Admin will review process securely.',
                data: { order }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async requestItemCancellation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id as string;
            const productId = req.params.productId as string;
            const { reason, remarks } = req.body;

            const order = await this.requestItemCancellationUseCase.execute(userId, orderId, productId, reason, remarks);

            res.status(200).json({
                success: true,
                message: 'Item cancellation request submitted successfully.',
                data: { order }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async requestReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id as string;
            const { reason, remarks, images } = req.body;

            const { order, updatedItems } = await this.requestReturnUseCase.execute(userId, orderId, reason, remarks, images);

            res.status(200).json({
                success: true,
                message: `Return request submitted for ${updatedItems.length} item(s).`,
                data: { order }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async requestItemReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id as string;
            const productId = req.params.productId as string;
            const { reason, remarks, images } = req.body;

            const order = await this.requestItemReturnUseCase.execute(userId, orderId, productId, reason, remarks, images);

            res.status(200).json({
                success: true,
                message: 'Item return request submitted successfully.',
                data: { order }
            });
        } catch (error: any) {
            next(error);
        }
    }

    public async getShippingCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const state = req.params.state as string;
            const charge = await this.getShippingChargeUseCase.execute(state);

            res.status(200).json({ success: true, data: charge });
        } catch (error: any) {
            next(error);
        }
    }
}
