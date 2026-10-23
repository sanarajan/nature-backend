import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { OrderModel } from '../../../infrastructure/database/models/OrderModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { getReturnInstructionsTemplate } from '../../../shared/constants/returnConfig';

import { IEmailService } from '../../../domain/services/IEmailService';

@injectable()
export class AdminReturnCancellationUseCases {
    constructor(
        @inject('IEmailService') private emailService?: IEmailService
    ) {}
    
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
        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

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

        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

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

        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

        order.statusHistory.push({
            status: `Returned: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await this.handleItemInfluencerRejection(order, item);
        await order.save();

        if (order.paymentMethod === 'COD' && this.emailService && order.userId) {
            try {
                const user = await UserModel.findById(order.userId);
                if (user && user.email) {
                    const alreadySent = order.statusHistory.some((h: any) => h.status === `Return Confirmation Email Sent (${item.productName})`);
                    if (!alreadySent) {
                        await this.emailService.sendReturnRefundConfirmationEmail({
                            email: user.email,
                            customerName: user.displayName || (user as any).name || 'Valued Customer',
                            orderId: order.orderId,
                            items: [{
                                productName: item.productName,
                                quantity: item.quantity
                            }],
                            refundAmount: order.returnedAmount,
                            paymentMethod: 'Cash on Delivery'
                        });

                        order.statusHistory.push({
                            status: `Return Confirmation Email Sent (${item.productName})`,
                            timestamp: new Date(),
                            updatedBy: 'System'
                        });
                        await order.save();
                    }
                }
            } catch (emailError) {
                console.error('Error sending COD return confirmation email:', emailError);
            }
        }

// Additional Return Confirmed email for COD and online orders.
if (this.emailService && order.userId) {
    try {
        const user = await UserModel.findById(order.userId);

        if (user?.email) {
            const marker =
                `Return Confirmed Email Sent (${item.productName})`;

            const alreadySent = order.statusHistory.some(
                (h: any) => h.status === marker
            );

            if (!alreadySent) {
                await this.emailService.sendReturnConfirmedEmail({
                    email: user.email,
                    customerName:
                        user.displayName ||
                        (user as any).name ||
                        'Valued Customer',
                    orderId: order.orderId,
                    items: [{
                        productName: item.productName,
                        quantity: item.quantity
                    }]
                });

                order.statusHistory.push({
                    status: marker,
                    timestamp: new Date(),
                    updatedBy: 'System'
                });

                await order.save();
            }
        }
    } catch (emailError) {
        console.error(
            'Error sending return confirmed email:',
            emailError
        );
    }
}



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

        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

        order.statusHistory.push({
            status: `Cancellation Accepted for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await this.handleItemInfluencerRejection(order, item);
        await order.save();

        if (this.emailService && order.userId) {
            try {
                const user = await UserModel.findById(order.userId);
                if (user && user.email) {
                    const alreadySent = order.statusHistory.some((h: any) => h.status === `Cancellation Email Sent (${item.productName})`);
                    if (!alreadySent) {
                        let refundInfo = '';
                        if (order.paymentMethod === 'COD') {
                            refundInfo = 'Since this was a Cash on Delivery order, no payment was collected and no refund is required.';
                        } else if (order.paymentStatus === 'Refunded') {
                            refundInfo = `A refund of ₹${order.refundedAmount || order.totalAmount} has been processed back to your original payment method.`;
                        } else {
                            refundInfo = 'A refund request has been initiated and will be processed back to your original payment method.';
                        }

                        await this.emailService.sendOrderCancellationEmail({
                            email: user.email,
                            customerName: user.displayName || (user as any).name || 'Valued Customer',
                            orderId: order.orderId,
                            items: [{
                                productName: item.productName,
                                quantity: item.quantity
                            }],
                            reason: item.cancellation?.reason || 'User requested cancellation (Approved by Admin)',
                            refundInfo
                        });

                        order.statusHistory.push({
                            status: `Cancellation Email Sent (${item.productName})`,
                            timestamp: new Date(),
                            updatedBy: 'System'
                        });
                        await order.save();
                    }
                }
            } catch (emailError) {
                console.error('Error sending cancellation acceptance email:', emailError);
            }
        }

// Additional approval email for online cancellation only.
if (
    order.paymentMethod !== 'COD' &&
    this.emailService &&
    order.userId
) {
    try {
        const user = await UserModel.findById(order.userId);

        if (user?.email) {
            const marker =
                `Cancellation Approved Email Sent (${item.productName})`;

            const alreadySent = order.statusHistory.some(
                (h: any) => h.status === marker
            );

            if (!alreadySent) {
                await this.emailService.sendCancellationApprovedEmail({
                    email: user.email,
                    customerName:
                        user.displayName ||
                        (user as any).name ||
                        'Valued Customer',
                    orderId: order.orderId,
                    items: [{
                        productName: item.productName,
                        quantity: item.quantity
                    }]
                });

                order.statusHistory.push({
                    status: marker,
                    timestamp: new Date(),
                    updatedBy: 'System'
                });

                await order.save();
            }
        }
    } catch (emailError) {
        console.error(
            'Error sending cancellation approved email:',
            emailError
        );
    }
}

        return order;
    }

    private async handleItemInfluencerRejection(order: any, item: any) {
        if (order.influencerId) {
            const influencer = await UserModel.findById(order.influencerId);
            if (influencer) {
                if (item.influencerCommissionStatus === 'PENDING') {
                    item.influencerCommissionStatus = 'REJECTED';
                    const itemComm = item.influencerCommissionAmount || 0;
                    if (itemComm > 0) {
                        influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - itemComm).toFixed(2)));
                        await influencer.save();
                    }
                } else if (!item.influencerCommissionAmount && order.influencerCommissionStatus === 'PENDING') {
                    const allTerminal = order.orderedProducts.every((p: any) => ['Cancelled', 'Returned', 'Expired'].includes(p.orderStatus));
                    if (allTerminal) {
                        order.influencerCommissionStatus = 'REJECTED';
                        const orderComm = order.influencerCommissionAmount || 0;
                        if (orderComm > 0) {
                            influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - orderComm).toFixed(2)));
                            await influencer.save();
                        }
                    }
                }
            }
        }
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

        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

        order.statusHistory.push({
            status: `Cancellation Rejected for: ${item.productName}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return order;
    }
}
