import { inject, injectable } from 'tsyringe';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { OrderModel } from '../../../infrastructure/database/models/OrderModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { EmailService } from '../../../infrastructure/services/EmailService';
import { UserLoyaltyUseCases } from '../user/UserLoyaltyUseCases';
import { IWhatsAppService } from '../../../domain/services/IWhatsAppService';
import { WhatsAppService } from '../../../infrastructure/services/WhatsAppService';

@injectable()
export class GetAllOrdersUseCase {
    constructor(
        @inject('IOrderRepository') private orderRepository: IOrderRepository,
        
    ) {}

    async execute() {
        // Find all orders via model directly to use populate and sync logic safely
        // Wait, the orderRepository.findAllOrders() uses populate.
        const orders = await this.orderRepository.findAllOrders();

        let updatedCount = 0;
        for (const order of orders) {
            const calculated = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
            if (order.globalOrderStatus !== calculated) {
                const orderIdentifier = order.orderId || order._id;
                console.log(`[DYNAMIC_SYNC] Correcting Order ${orderIdentifier}: "${order.globalOrderStatus}" -> "${calculated}"`);
                await OrderModel.updateOne({ _id: order._id }, { $set: { globalOrderStatus: calculated } });
                order.globalOrderStatus = calculated; // update the local object for consistency
                updatedCount++;
            }
        }
        if (updatedCount > 0) console.log(`[DYNAMIC_SYNC] Corrected ${updatedCount} orders during fetch.`);

        return orders;
    }
}

@injectable()
export class GetOrderByIdUseCase {
    constructor(
        @inject('IOrderRepository') private orderRepository: IOrderRepository
    ) {}

    async execute(id: string) {
        const order = await OrderModel.findById(id)
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });

        if (!order) {
            throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);
        }

        const calculated = (order.constructor as any).calculateGlobalStatus(order.orderedProducts);
        if (order.globalOrderStatus !== calculated) {
            const orderIdentifier = order.orderId || order._id;
            console.log(`[DYNAMIC_SYNC] Correcting Order ${orderIdentifier} in detail view: "${order.globalOrderStatus}" -> "${calculated}"`);
            await OrderModel.updateOne({ _id: order._id }, { $set: { globalOrderStatus: calculated } });
            order.globalOrderStatus = calculated;
        }

        return order;
    }
}

@injectable()
export class UpdateOrderStatusUseCase {
    constructor(
        @inject('IEmailService') private emailService: EmailService,
         @inject('IWhatsAppService') private whatsAppService?: IWhatsAppService
    ) {}

    async execute(id: string, data: any, adminName: string) {
        const { status, reason, productId, shippingDetails } = data;

        const order = await OrderModel.findById(id).populate('userId');
        if (!order) {
            throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);
        }

        let updatedItemName = 'All Items';
        let shippedProduct = null;

        if (productId) {
            const product = order.orderedProducts.find(p => p.productId.toString() === productId || (p as any)._id?.toString() === productId);
            if (!product) {
                throw new AppError('Product not found in order', STATUS_CODES.NOT_FOUND);
            }

            updatedItemName = product.productName;
            const previousStatus = product.orderStatus;
            product.orderStatus = status;

            if (status === 'Shipped' && shippingDetails) {
                const expectedDate = shippingDetails.expectedDeliveryDate ? new Date(shippingDetails.expectedDeliveryDate) : undefined;
                if (expectedDate && expectedDate <= new Date()) {
                    throw new AppError('Expected delivery date must be in the future', STATUS_CODES.BAD_REQUEST);
                }
                product.shippingDetails = {
                    agencyName: shippingDetails.agencyName,
                    trackingNumber: shippingDetails.trackingNumber,
                    agencyUrl: shippingDetails.agencyUrl,
                    shippedDate: new Date(),
                    expectedDeliveryDate: expectedDate
                };
                shippedProduct = product;
            }

            if (status === 'Out for Delivery' && shippingDetails && shippingDetails.expectedDeliveryDate) {
                if (product.shippingDetails) {
                    product.shippingDetails.expectedDeliveryDate = new Date(shippingDetails.expectedDeliveryDate);
                } else {
                    product.shippingDetails = {
                        agencyName: 'N/A',
                        trackingNumber: 'N/A',
                        shippedDate: new Date(),
                        expectedDeliveryDate: new Date(shippingDetails.expectedDeliveryDate)
                    };
                }
            }

            if (status === 'Delivered') {
                if (product.shippingDetails) {
                    product.shippingDetails.deliveredDate = product.shippingDetails.deliveredDate || new Date();
                } else {
                    product.shippingDetails = {
                        agencyName: 'N/A',
                        trackingNumber: 'N/A',
                        shippedDate: new Date(),
                        deliveredDate: new Date()
                    };
                }
                
                // Award Nature Points if newly delivered
                if (status === 'Delivered' && previousStatus !== 'Delivered' && !product.cancellation?.cancelDate && !product.returnRequest?.requestDate) {
                    (async () => {
                        try {
                            const loyaltyUseCases = new UserLoyaltyUseCases();
                            const eligibleAmount = order.totalMRP - (order.totalDiscount || 0) || order.totalAmount;
                            const uId = (order.userId as any)._id ? (order.userId as any)._id.toString() : order.userId.toString();
                            await loyaltyUseCases.earnPoints(uId, eligibleAmount, order.orderId);
                        } catch (e) {
                            console.error('Error awarding Nature Points:', e);
                        }
                    })();
                }
            }

            if (status === 'Cancelled') {
                product.cancellation = {
                    reason: reason || 'Cancelled by Admin',
                    cancelDate: new Date()
                };
                product.cancelledBy = adminName;
            }

            if (status === 'Returned' || status === 'Return') {
                product.cancellation = {
                    reason: reason || 'Returned by Admin',
                    cancelDate: new Date()
                };
            }
        } else {
            order.orderedProducts.forEach(product => {
                const previousStatus = product.orderStatus;
                product.orderStatus = status;

                if (status === 'Shipped' && shippingDetails) {
                    const expectedDate = shippingDetails.expectedDeliveryDate ? new Date(shippingDetails.expectedDeliveryDate) : undefined;
                    if (expectedDate && expectedDate <= new Date()) {
                        throw new AppError('Expected delivery date must be in the future', STATUS_CODES.BAD_REQUEST);
                    }
                    product.shippingDetails = {
                        agencyName: shippingDetails.agencyName,
                        trackingNumber: shippingDetails.trackingNumber,
                        agencyUrl: shippingDetails.agencyUrl,
                        shippedDate: new Date(),
                        expectedDeliveryDate: expectedDate
                    };
                    shippedProduct = product;
                }

                if (status === 'Out for Delivery' && shippingDetails && shippingDetails.expectedDeliveryDate) {
                    if (product.shippingDetails) {
                        product.shippingDetails.expectedDeliveryDate = new Date(shippingDetails.expectedDeliveryDate);
                    } else {
                        product.shippingDetails = {
                            agencyName: 'N/A',
                            trackingNumber: 'N/A',
                            shippedDate: new Date(),
                            expectedDeliveryDate: new Date(shippingDetails.expectedDeliveryDate)
                        };
                    }
                }

                if (status === 'Delivered') {
                    if (product.shippingDetails) {
                        product.shippingDetails.deliveredDate = product.shippingDetails.deliveredDate || new Date();
                    } else {
                        product.shippingDetails = {
                            agencyName: 'N/A',
                            trackingNumber: 'N/A',
                            shippedDate: new Date(),
                            deliveredDate: new Date()
                        };
                    }
                    // Award Nature Points if newly delivered
                    if (status === 'Delivered' && previousStatus !== 'Delivered' && !product.cancellation?.cancelDate && !product.returnRequest?.requestDate) {
                        (async () => {
                            try {
                                const loyaltyUseCases = new UserLoyaltyUseCases();
                                const eligibleAmount = order.totalMRP - (order.totalDiscount || 0) || order.totalAmount;
                                const uId = (order.userId as any)._id ? (order.userId as any)._id.toString() : order.userId.toString();
                                await loyaltyUseCases.earnPoints(uId, eligibleAmount, order.orderId);
                            } catch (e) {
                                console.error('Error awarding Nature Points:', e);
                            }
                        })();
                    }
                }

                if (status === 'Cancelled') {
                    product.cancellation = {
                        reason: reason || 'Cancelled by Admin',
                        cancelDate: new Date()
                    };
                    product.cancelledBy = adminName;
                }

                if (status === 'Returned' || status === 'Return') {
                    product.cancellation = {
                        reason: reason || 'Returned by Admin',
                        cancelDate: new Date()
                    };
                    
                    // Reverse earned points
                    (async () => {
                        try {
                            const loyaltyUseCases = new UserLoyaltyUseCases();
                            await loyaltyUseCases.reverseEarnedPoints(order.userId.toString(), order.orderId);
                        } catch (e) {
                            console.error('Error reversing Nature Points:', e);
                        }
                    })();
                }
            });

            if (status === 'Cancelled' || status === 'Cancellation Request') {
                if (order.paymentMethod === 'COD') {
                    order.paymentStatus = 'Cancelled';
                } else if (order.paymentStatus !== 'Refunded') {
                    order.paymentStatus = 'Refund_Pending';
                }
            } else if (status === 'Returned' || status === 'Return' || status === 'Return Request') {
                if (order.paymentMethod === 'COD') {
                    order.paymentStatus = 'Returned';
                } else if (order.paymentStatus !== 'Refunded') {
                    order.paymentStatus = 'Refund_Pending';
                }
            }
        }

        order.markModified('orderedProducts');
        order.globalOrderStatus = (OrderModel as any).calculateGlobalStatus(order.orderedProducts);
        order.markModified('globalOrderStatus');

        console.log(`[USE CASE] Order ${order.orderId} updated to: ${order.globalOrderStatus}`);

        if (order.paymentMethod === 'COD' && order.paymentStatus !== 'Completed') {
            const products = order.orderedProducts;
            const terminalStates = ['Delivered', 'Cancelled', 'Returned'];
            const allFinished = products.every(p => terminalStates.includes(p.orderStatus));
            const anyDelivered = products.some(p => p.orderStatus === 'Delivered');

            if (allFinished && anyDelivered) {
                order.paymentStatus = 'Completed';
            }
        }

        if (order.influencerId) {
            const influencer = await UserModel.findById(order.influencerId);
            if (influencer) {
                let pendingBalanceChanged = false;
                let hasProductSnapshots = false;

                order.orderedProducts.forEach(p => {
                    if (p.influencerCommissionAmount !== undefined && p.influencerCommissionAmount !== null) {
                        hasProductSnapshots = true;
                    }
                    if (['Cancelled', 'Returned', 'Expired'].includes(p.orderStatus) && p.influencerCommissionStatus === 'PENDING') {
                        p.influencerCommissionStatus = 'REJECTED';
                        const itemComm = p.influencerCommissionAmount || 0;
                        if (itemComm > 0) {
                            influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - itemComm).toFixed(2)));
                            pendingBalanceChanged = true;
                        }
                    } else if (p.orderStatus === 'Delivered' && !p.returnExpiryDate) {
                        const delivered = p.shippingDetails?.deliveredDate || order.deliveredAt || new Date();
                        const expiry = new Date(delivered);
                        expiry.setDate(expiry.getDate() + 7);
                        p.returnExpiryDate = expiry;
                    }
                });

                if (!hasProductSnapshots && order.influencerCommissionStatus === 'PENDING' && ['CANCELLED', 'RETURNED', 'Expired', 'Cancelled', 'Returned'].includes(order.globalOrderStatus)) {
                    order.influencerCommissionStatus = 'REJECTED';
                    const orderComm = order.influencerCommissionAmount || 0;
                    if (orderComm > 0) {
                        influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - orderComm).toFixed(2)));
                        pendingBalanceChanged = true;
                    }
                }

                if (pendingBalanceChanged) {
                    await influencer.save();
                }
            }

            if ((order.globalOrderStatus === 'DELIVERED' || order.globalOrderStatus === 'Delivered') && !order.deliveredAt) {
                order.deliveredAt = new Date();
                const returnExpiry = new Date(order.deliveredAt.getTime());
                returnExpiry.setDate(returnExpiry.getDate() + 7);
                order.returnExpiryDate = returnExpiry;
            }
        }

        order.statusHistory.push({
            status: `${status} (${updatedItemName})`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        // Invoice Finalization logic
        if (!order.invoiceFinalized) {
            const excludedStatuses = ['Cancelled', 'Returned', 'Return', 'Expired', 'Return Approved'];
            const preShipmentStatuses = ['Pending', 'Order Placed', 'Processing', 'Cancellation Request', 'Return Request'];
            
            const applicableProducts = order.orderedProducts.filter(p => !excludedStatuses.includes(p.orderStatus));
            const hasPreShipment = applicableProducts.some(p => preShipmentStatuses.includes(p.orderStatus));
            
            if (applicableProducts.length > 0 && !hasPreShipment) {
                order.invoiceFinalized = true;
                order.invoiceFinalizedAt = new Date();
                console.log(`[INVOICE] Finalized invoice data for Order ${order.orderId}`);
            }
        }

        await order.save();
        
        // WhatsApp notification for full-order delivery only
        if (
            status === 'Delivered' &&
            !productId &&
            order.userId &&
            this.whatsAppService
        ) {
            const user = order.userId as any;

            const allProductsDelivered =
                order.orderedProducts.length > 0 &&
                order.orderedProducts.every(
                    (product: any) => product.orderStatus === 'Delivered'
                );

            const alreadySent = order.statusHistory.some(
                (h: any) => h.status === 'Order Delivered WhatsApp Sent'
            );

            if (
                allProductsDelivered &&
                !alreadySent &&
                user.phoneNumber
            ) {
                try {
                    const orderUrl =
                         order._id.toString();

                    await this.whatsAppService.sendOrderDelivered(
                        user.phoneNumber,
                        user.displayName || user.name || 'Customer',
                        order.orderId,
                        orderUrl
                    );

                    order.statusHistory.push({
                        status: 'Order Delivered WhatsApp Sent',
                        timestamp: new Date(),
                        updatedBy: 'System'
                    });

                    await order.save();
                } catch (whatsAppError) {
                    console.error(
                        'Error sending order delivered WhatsApp:',
                        whatsAppError
                    );
                }
            }
        }

//shipping whatsap message

        // WhatsApp notification for shipped products
        if (
            status === 'Shipped' &&
            order.userId &&
            this.whatsAppService
        ) {
            const user = order.userId as any;

            if (user.phoneNumber) {
                const productsToNotify = productId
                    ? order.orderedProducts.filter(
                          (product: any) =>
                              product.productId?.toString() === productId ||
                              product._id?.toString() === productId
                      )
                    : order.orderedProducts;

                for (const product of productsToNotify as any[]) {
                    if (!product.shippingDetails) {
                        console.warn(
                            `Shipping details missing for ${product.productName}; skipping WhatsApp.`
                        );
                        continue;
                    }

                    const itemId =
                        product._id?.toString() ||
                        product.productId?.toString();

                    const sentMarker =
                        `Product Shipped WhatsApp Sent (${itemId})`;

                    const alreadySent = order.statusHistory.some(
                        (history: any) =>
                            history.status === sentMarker
                    );

                    if (alreadySent) {
                        continue;
                    }

                    try {
                     

                                                await this.whatsAppService.sendProductShipped(
                            user.phoneNumber,
                            user.displayName || user.name || 'Customer',
                            product.productName,
                            order.orderId,
                            product.shippingDetails.agencyUrl ||
                                order._id.toString()
                        );

                        order.statusHistory.push({
                            status: sentMarker,
                            timestamp: new Date(),
                            updatedBy: 'System'
                        });

                        await order.save();
                    } catch (whatsAppError) {
                        console.error(
                            `Error sending shipped WhatsApp for ${product.productName}:`,
                            whatsAppError
                        );
                    }
                }
            }
        }

        if (status === 'Shipped' && shippedProduct && order.userId) {
            if (!shippedProduct.shippingDetails) {
                throw new AppError('Shipping details are missing for shipped product', STATUS_CODES.BAD_REQUEST);
            }
            const user = order.userId as any;

            
            if (user.email) {
                try {
                    await this.emailService.sendShippingEmail(
                        user.email,
                        order.orderId,
                        shippedProduct.productName,
                        shippedProduct.shippingDetails.agencyName,
                        shippedProduct.shippingDetails.trackingNumber,
                        shippedProduct.shippingDetails.agencyUrl
                    );
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                }
            }
        }

        if (status === 'Delivered' && order.userId && this.emailService) {
            const user = order.userId as any;
            if (user.email) {
                const alreadySent = order.statusHistory.some((h: any) => h.status === `Delivery Confirmation Email Sent (${updatedItemName})`);
                if (!alreadySent) {
                    try {
                        const itemsToDeliver = productId
                            ? order.orderedProducts.filter(p => p.productId.toString() === productId || (p as any)._id?.toString() === productId)
                            : order.orderedProducts;

                        await this.emailService.sendDeliveryConfirmationEmail({
                            email: user.email,
                            customerName: user.displayName || user.name || 'Valued Customer',
                            orderId: order.orderId,
                            items: itemsToDeliver.map(p => ({
                                productName: p.productName,
                                quantity: p.quantity
                            }))
                        });

                        order.statusHistory.push({
                            status: `Delivery Confirmation Email Sent (${updatedItemName})`,
                            timestamp: new Date(),
                            updatedBy: 'System'
                        });
                        await order.save();
                    } catch (emailError) {
                        console.error('Error sending delivery confirmation email:', emailError);
                    }
                }
            }
        }

        //here we need to make single product delivered whatsapp message

        //end here we need to make single product delivered whatsapp message

        if (status === 'Cancelled' && order.userId && this.emailService) {
            const user = order.userId as any;
            if (user.email) {
                const alreadySent = order.statusHistory.some((h: any) => h.status === `Cancellation Email Sent (${updatedItemName})`);
                if (!alreadySent) {
                    try {
                        const cancelledItems = productId
                            ? order.orderedProducts.filter(p => p.productId.toString() === productId || (p as any)._id?.toString() === productId)
                            : order.orderedProducts;

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
                            customerName: user.displayName || user.name || 'Valued Customer',
                            orderId: order.orderId,
                            items: cancelledItems.map(p => ({
                                productName: p.productName,
                                quantity: p.quantity
                            })),
                            reason: reason || 'Cancelled by Admin',
                            refundInfo
                        });

                        order.statusHistory.push({
                            status: `Cancellation Email Sent (${updatedItemName})`,
                            timestamp: new Date(),
                            updatedBy: 'System'
                        });
                        await order.save();
                    } catch (emailError) {
                        console.error('Error sending cancellation email:', emailError);
                    }
                }
            }
        }

        return await OrderModel.findById(id).populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });
    }
}

export class UpdateDeliveryDelayUseCase {
    async execute(orderId: string, productId: string, data: { newExpectedDate: string; reason: string }, adminName: string) {
        const order = await OrderModel.findById(orderId).populate('userId');
        if (!order) {
            throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);
        }

        const product = order.orderedProducts.find(p => p.productId.toString() === productId || (p as any)._id?.toString() === productId);
        if (!product) {
            throw new AppError('Product not found in order', STATUS_CODES.NOT_FOUND);
        }

        if (product.orderStatus !== 'Out for Delivery') {
            throw new AppError('Product is not Out for Delivery', STATUS_CODES.BAD_REQUEST);
        }

        const newDate = new Date(data.newExpectedDate);
        if (newDate <= new Date()) {
            throw new AppError('New expected delivery date must be in the future', STATUS_CODES.BAD_REQUEST);
        }

        const previousExpectedDate = product.shippingDetails?.expectedDeliveryDate;

        if (!product.deliveryUpdates) {
            product.deliveryUpdates = [];
        }

        product.deliveryUpdates.push({
            previousExpectedDate: previousExpectedDate,
            newExpectedDate: newDate,
            reason: data.reason,
            updatedBy: adminName,
            updatedDate: new Date()
        });

        if (product.shippingDetails) {
            product.shippingDetails.expectedDeliveryDate = newDate;
        }

        order.markModified('orderedProducts');
        
        order.statusHistory.push({
            status: `Delivery Delayed (${product.productName})`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        return await OrderModel.findById(orderId).populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });
    }
}

@injectable()
export class UpdatePaymentStatusUseCase {
    constructor(
        @inject('IEmailService') private emailService?: EmailService
    ) {}

    async execute(id: string, data: any, adminName: string) {
        const { status, refundedAmount } = data;

        const order = await OrderModel.findById(id).populate({ path: 'userId', model: 'User', select: 'displayName email' });
        if (!order) {
            throw new AppError('Order not found', STATUS_CODES.NOT_FOUND);
        }

        const previousPaymentStatus = order.paymentStatus;
        order.paymentStatus = status;
        if (refundedAmount !== undefined) {
            order.refundedAmount = refundedAmount;
        }

        order.statusHistory.push({
            status: `Payment Status Updated: ${status}${refundedAmount ? ` (Refund: ₹${refundedAmount})` : ''}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();

       if (
    status === 'Refunded' &&
    previousPaymentStatus !== 'Refunded' &&
    this.emailService &&
    order.userId
) {
    const user = order.userId as any;

    if (user.email) {
        const returnedItems = order.orderedProducts.filter(p =>
            [
                'Returned',
                'Return Approved',
                'Return Request',
                'Return',
                'Cancelled',
                'Cancellation Request'
            ].includes(p.orderStatus)
        );

        const itemsToList =
            returnedItems.length > 0 ? returnedItems : order.orderedProducts;

        const emailItems = itemsToList.map(p => ({
            productName: p.productName,
            quantity: p.quantity
        }));

        const refundAmount =
            refundedAmount ?? order.refundedAmount ?? order.totalAmount;

        // Existing combined Return/Refund email — preserve it
        const oldEmailAlreadySent = order.statusHistory.some(
            (h: any) =>
                h.status === 'Return/Refund Confirmation Email Sent'
        );

        if (!oldEmailAlreadySent) {
            try {
                await this.emailService.sendReturnRefundConfirmationEmail({
                    email: user.email,
                    customerName:
                        user.displayName || user.name || 'Valued Customer',
                    orderId: order.orderId,
                    items: emailItems,
                    refundAmount,
                    paymentMethod: order.paymentMethod || 'Online',
                    transactionReference: order.razorpayPaymentId
                });

                order.statusHistory.push({
                    status: 'Return/Refund Confirmation Email Sent',
                    timestamp: new Date(),
                    updatedBy: 'System'
                });

                await order.save();
            } catch (emailError) {
                console.error(
                    'Error sending return/refund confirmation email:',
                    emailError
                );
            }
        }

        // New refund-success email — independent marker
        const refundEmailAlreadySent = order.statusHistory.some(
            (h: any) => h.status === 'Payment Refunded Email Sent'
        );

        if (!refundEmailAlreadySent) {
            try {
                await this.emailService.sendPaymentRefundedEmail({
                    email: user.email,
                    customerName:
                        user.displayName || user.name || 'Valued Customer',
                    orderId: order.orderId,
                    items: emailItems,
                    refundAmount,
                    paymentMethod: order.paymentMethod || 'Online',
                    transactionReference: order.razorpayPaymentId
                });

                order.statusHistory.push({
                    status: 'Payment Refunded Email Sent',
                    timestamp: new Date(),
                    updatedBy: 'System'
                });

                await order.save();
            } catch (emailError) {
                console.error(
                    'Error sending payment-refunded email:',
                    emailError
                );
            }
        }
    }
}

        return order;
    }
}
