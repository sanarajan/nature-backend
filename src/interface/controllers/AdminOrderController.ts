import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import {
    GetAllOrdersUseCase,
    GetOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    UpdatePaymentStatusUseCase,
    UpdateDeliveryDelayUseCase
} from '../../application/usecases/admin/AdminOrderUseCases';
import { AdminReturnCancellationUseCases } from '../../application/usecases/admin/AdminReturnCancellationUseCases';
import { InvoiceGeneratorService } from '../../infrastructure/services/InvoiceGeneratorService';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { AppError } from '../../shared/utils/AppError';

@injectable()
export class AdminOrderController {
    constructor(
        @inject('IGetAllOrdersUseCase') private getAllOrdersUseCase: GetAllOrdersUseCase,
        @inject('IGetOrderByIdUseCase') private getOrderByIdUseCase: GetOrderByIdUseCase,
        @inject('IUpdateOrderStatusUseCase') private updateOrderStatusUseCase: UpdateOrderStatusUseCase,
        @inject('IUpdatePaymentStatusUseCase') private updatePaymentStatusUseCase: UpdatePaymentStatusUseCase,
        @inject('IUpdateDeliveryDelayUseCase') private updateDeliveryDelayUseCase: UpdateDeliveryDelayUseCase,
        @inject('IAdminReturnCancellationUseCases') private returnCancelUseCases: AdminReturnCancellationUseCases
    ) {}

    getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orders = await this.getAllOrdersUseCase.execute();
            res.status(200).json({ success: true, data: orders });
        } catch (error: any) {
            next(error);
        }
    };

    getOrderById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const order = await this.getOrderByIdUseCase.execute(id);
            res.status(200).json({ success: true, data: order });
        } catch (error: any) {
            next(error);
        }
    };

    updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const updatedOrder = await this.updateOrderStatusUseCase.execute(id, req.body, adminName);
            res.status(200).json({ success: true, message: `Order status updated to ${req.body.status}`, data: updatedOrder });
        } catch (error: any) {
            next(error);
        }
    };

    updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const order = await this.updatePaymentStatusUseCase.execute(id, req.body, adminName);
            res.status(200).json({ success: true, message: `Payment Status updated to ${req.body.status}`, data: order });
        } catch (error: any) {
            next(error);
        }
    };

    acceptReturnRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const { adminNotes } = req.body;
            const order = await this.returnCancelUseCases.acceptReturnRequest(id, productId, adminNotes, adminName);
            res.status(200).json({ success: true, message: 'Return request accepted', data: order });
        } catch (error: any) {
            next(error);
        }
    };

    rejectReturnRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const { rejectionReason } = req.body;
            const order = await this.returnCancelUseCases.rejectReturnRequest(id, productId, rejectionReason, adminName);
            res.status(200).json({ success: true, message: 'Return request rejected', data: order });
        } catch (error: any) {
            next(error);
        }
    };

    completeReturn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const order = await this.returnCancelUseCases.completeReturn(id, productId, adminName);
            res.status(200).json({ success: true, message: 'Item marked as returned successfully', data: order });
        } catch (error: any) {
            next(error);
        }
    };

    acceptCancellationRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const order = await this.returnCancelUseCases.acceptCancellationRequest(id, productId, adminName);
            res.status(200).json({ success: true, message: 'Cancellation request accepted', data: order });
        } catch (error: any) {
            next(error);
        }
    };

    rejectCancellationRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const { rejectionReason } = req.body;
            const order = await this.returnCancelUseCases.rejectCancellationRequest(id, productId, rejectionReason, adminName);
            res.status(200).json({ success: true, message: 'Cancellation request rejected', data: order });
        } catch (error: any) {
            next(error);
        }
    };

    updateDeliveryDelay = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const productId = req.params.productId as string;
            const adminName = (req as any).admin?.displayName || 'Admin';
            const updatedOrder = await this.updateDeliveryDelayUseCase.execute(id, productId, req.body, adminName);
            res.status(200).json({ success: true, message: 'Delivery delay updated successfully', data: updatedOrder });
        } catch (error: any) {
            next(error);
        }
    };

    downloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const order = await OrderModel.findById(id).populate({ path: 'userId', model: 'User', select: 'displayName email phoneNumber' });
            
            if (!order) {
                throw new AppError('Order not found', 404);
            }
            
            if (!order.invoiceFinalized) {
                const excludedStatuses = ['Cancelled', 'Returned', 'Return', 'Expired', 'Return Approved'];
                const preShipmentStatuses = ['Pending', 'Order Placed', 'Processing', 'Cancellation Request', 'Return Request'];
                
                const applicableProducts = order.orderedProducts.filter(p => !excludedStatuses.includes(p.orderStatus));
                const hasPreShipment = applicableProducts.some(p => preShipmentStatuses.includes(p.orderStatus));
                
                if (applicableProducts.length > 0 && !hasPreShipment) {
                    order.invoiceFinalized = true;
                    order.invoiceFinalizedAt = new Date();
                    console.log(`[INVOICE] Lazy finalized invoice data for Order ${order.orderId} on download`);
                    await order.save();
                } else {
                    throw new AppError('Invoice not available for this order yet', 400);
                }
            }

            const pdfBuffer = await InvoiceGeneratorService.generateInvoice(order);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Naturalayam-Invoice-${order.orderId}.pdf`);
            res.send(pdfBuffer);
        } catch (error: any) {
            next(error);
        }
    };
}
