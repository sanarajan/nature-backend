import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { OrderModel } from '../../../infrastructure/database/models/OrderModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { getReturnInstructionsTemplate } from '../../../shared/constants/returnConfig';

@injectable()
export class AdminReturnCancellationUseCases {
    
    async acceptReturnRequest(orderId: string, productId: string, adminNotes: string, adminName: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);

        const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
        if (!item) throw new AppError('Item not found', STATUS_CODES.NOT_FOUND);

        if (item.orderStatus !== 'Return Request') {
            throw new AppError('Item is not in Return Request status', STATUS_CODES.BAD_REQUEST);
        }

        if (!item.returnRequest) item.returnRequest = {};
        item.returnRequest.isAccepted = true;
        item.returnRequest.adminNotes = adminNotes || getReturnInstructionsTemplate();

        item.orderStatus = 'Return Approved';
        order.globalOrderStatus = (order as any).calculateGlobalOrderStatus();

        order.statusHistory.push({
            status: `Return Request Accepted for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }

    async rejectReturnRequest(orderId: string, productId: string, rejectionReason: string, adminName: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);

        const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
        if (!item) throw new AppError('Item not found', STATUS_CODES.NOT_FOUND);

        if (item.orderStatus !== 'Return Request') {
            throw new AppError('Item is not in Return Request status', STATUS_CODES.BAD_REQUEST);
        }

        if (!rejectionReason || !rejectionReason.trim()) {
            throw new AppError('Rejection reason is mandatory', STATUS_CODES.BAD_REQUEST);
        }

        item.orderStatus = 'Delivered'; // Revert back to delivered
        if (!item.returnRequest) item.returnRequest = {};
        item.returnRequest.isRejected = true;
        item.returnRequest.rejectionReason = rejectionReason;

        order.globalOrderStatus = (order as any).calculateGlobalOrderStatus();

        order.statusHistory.push({
            status: `Return Request Rejected for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }

    async completeReturn(orderId: string, productId: string, adminName: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);

        const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
        if (!item) throw new AppError('Item not found', STATUS_CODES.NOT_FOUND);

        if (item.orderStatus !== 'Return Approved' && item.orderStatus !== 'Return') {
            throw new AppError('Item must be in Return Approved state to be completed', STATUS_CODES.BAD_REQUEST);
        }

        item.orderStatus = 'Returned';

        if (item.shippingDetails) {
            item.shippingDetails.returnedDate = new Date();
        } else {
            item.shippingDetails = {
                agencyName: 'N/A',
                trackingNumber: 'N/A',
                shippedDate: new Date(),
                returnedDate: new Date()
            };
        }

        if (order.paymentMethod === 'COD') {
            order.paymentStatus = 'Returned';
        } else if (order.paymentStatus !== 'Refunded') {
            order.paymentStatus = 'Refund_Pending';
        }

        order.globalOrderStatus = (order as any).calculateGlobalOrderStatus();

        order.statusHistory.push({
            status: `Returned: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }

    async acceptCancellationRequest(orderId: string, productId: string, adminName: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);

        const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
        if (!item) throw new AppError('Item not found', STATUS_CODES.NOT_FOUND);

        if (item.orderStatus !== 'Cancellation Request') {
            throw new AppError('Item is not in Cancellation Request status', STATUS_CODES.BAD_REQUEST);
        }

        item.orderStatus = 'Cancelled';
        
        if (!item.cancellation) item.cancellation = {};
        item.cancellation.isAccepted = true;
        item.cancelledBy = adminName;

        if (order.paymentMethod === 'COD') {
            order.paymentStatus = 'Cancelled';
        } else if (order.paymentStatus !== 'Refunded') {
            order.paymentStatus = 'Refund_Pending';
        }

        order.globalOrderStatus = (order as any).calculateGlobalOrderStatus();

        order.statusHistory.push({
            status: `Cancellation Accepted for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }

    async rejectCancellationRequest(orderId: string, productId: string, rejectionReason: string, adminName: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);

        const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
        if (!item) throw new AppError('Item not found', STATUS_CODES.NOT_FOUND);

        if (item.orderStatus !== 'Cancellation Request') {
            throw new AppError('Item is not in Cancellation Request status', STATUS_CODES.BAD_REQUEST);
        }

        if (!rejectionReason || !rejectionReason.trim()) {
            throw new AppError('Rejection reason is mandatory', STATUS_CODES.BAD_REQUEST);
        }

        item.orderStatus = order.globalOrderStatus === 'PROCESSING' || order.globalOrderStatus === 'PARTIALLY_PROCESSING' || order.globalOrderStatus === 'Processed' ? 'Processing' : 'Order Placed';
        
        if (!item.cancellation) item.cancellation = {};
        item.cancellation.isRejected = true;
        item.cancellation.rejectionReason = rejectionReason;

        order.globalOrderStatus = (order as any).calculateGlobalOrderStatus();

        order.statusHistory.push({
            status: `Cancellation Rejected for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }
}
