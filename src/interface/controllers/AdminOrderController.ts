import { Request, Response } from 'express';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { container } from '../../infrastructure/config/container';
import { EmailService } from '../../infrastructure/services/EmailService';

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        console.log("reaching list order cont");
        const orders = await OrderModel.find()
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl' })
            .sort({ createdAt: -1 });

        // DYNAMIC SYNC: Ensure all orders have correct global status
        let updatedCount = 0;
        for (const order of orders) {
            const calculated = OrderModel.calculateGlobalStatus(order.orderedProducts);
            if (order.globalOrderStatus !== calculated) {
                console.log(`[DYNAMIC_SYNC] Correcting Order ${order.orderId}: "${order.globalOrderStatus}" -> "${calculated}"`);
                order.globalOrderStatus = calculated;
                await order.save();
                updatedCount++;
            }
        }
        if (updatedCount > 0) console.log(`[DYNAMIC_SYNC] Corrected ${updatedCount} orders during fetch.`);

        res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error fetching orders' });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const order = await OrderModel.findById(id)
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // DYNAMIC SYNC: Ensure details view is always accurate
        const calculated = (order.constructor as any).calculateGlobalStatus(order.orderedProducts);
        if (order.globalOrderStatus !== calculated) {
            console.log(`[DYNAMIC_SYNC] Correcting Order ${order.orderId} in detail view: "${order.globalOrderStatus}" -> "${calculated}"`);
            order.globalOrderStatus = calculated;
            await order.save();
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching order details' });
    }
};
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason, productId, shippingDetails } = req.body;

        const order = await OrderModel.findById(id).populate('userId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const adminName = (req as any).admin?.displayName || 'Admin';
        let updatedItemName = 'All Items';
        let shippedProduct = null;

        if (productId) {
            // Find the specific product
            const product = order.orderedProducts.find(p => p.productId.toString() === productId || (p as any)._id?.toString() === productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found in order' });
            }

            updatedItemName = product.productName;
            product.orderStatus = status;

            if (status === 'Shipped' && shippingDetails) {
                product.shippingDetails = {
                    agencyName: shippingDetails.agencyName,
                    trackingNumber: shippingDetails.trackingNumber,
                    agencyUrl: shippingDetails.agencyUrl,
                    shippedDate: new Date()
                };
                shippedProduct = product;
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
            // Update status for all products in the order
            order.orderedProducts.forEach(product => {
                product.orderStatus = status;

                if (status === 'Shipped' && shippingDetails) {
                    product.shippingDetails = {
                        agencyName: shippingDetails.agencyName,
                        trackingNumber: shippingDetails.trackingNumber,
                        agencyUrl: shippingDetails.agencyUrl,
                        shippedDate: new Date()
                    };
                    shippedProduct = product;
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
            });

            // Handle Payment Status logic
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

        // Mark the products array as modified explicitly to ensure Mongoose tracks changes
        order.markModified('orderedProducts');

        // RECALCULATE GLOBAL STATUS (Per User Requirement)
        // Using the instance method defined in OrderModel
        order.globalOrderStatus = order.calculateGlobalOrderStatus();
        order.markModified('globalOrderStatus');

        console.log(`[CONTROLLER] Order ${order.orderId} updated to: ${order.globalOrderStatus}`);

        // Update Payment Status for COD if all items are terminal (delivered, cancelled, or returned)
        // and at least one was delivered.
        if (order.paymentMethod === 'COD' && order.paymentStatus !== 'Completed') {
            const products = order.orderedProducts;
            const terminalStates = ['Delivered', 'Cancelled', 'Returned'];
            const allFinished = products.every(p => terminalStates.includes(p.orderStatus));
            const anyDelivered = products.some(p => p.orderStatus === 'Delivered');

            if (allFinished && anyDelivered) {
                order.paymentStatus = 'Completed';
            }
        }

        // Add to history
        order.statusHistory.push({
            status: `${status} (${updatedItemName})`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        // SAVE the order (Per User Requirement) - this triggers pre-save hooks
        await order.save();

        // Send Shipping Email if applicable
        if (status === 'Shipped' && shippedProduct && order.userId) {
            const user = order.userId as any;
            if (user.email) {
                try {
                    const emailService = container.resolve(EmailService);
                    await emailService.sendShippingEmail(
                        user.email,
                        order.orderId,
                        shippedProduct.productName,
                        shippedProduct.shippingDetails!.agencyName,
                        shippedProduct.shippingDetails!.trackingNumber,
                        shippedProduct.shippingDetails!.agencyUrl
                    );
                } catch (emailError) {
                    console.error('Error resolving EmailService or sending email:', emailError);
                }
            }
        }

        // Repopulate user details for the frontend
        const updatedOrder = await OrderModel.findById(id)
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });

        res.status(200).json({ success: true, message: `Order status updated to ${status}`, data: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating status' });
    }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, refundedAmount } = req.body;

        const order = await OrderModel.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.paymentStatus = status;
        if (refundedAmount !== undefined) {
            order.refundedAmount = refundedAmount;
        }

        const adminName = (req as any).admin?.displayName || 'Admin';
        order.statusHistory.push({
            status: `Payment Status Updated: ${status}${refundedAmount ? ` (Refund: ₹${refundedAmount})` : ''}`,
            timestamp: new Date(),
            updatedBy: adminName
        });

        await order.save();
        res.status(200).json({ success: true, message: `Payment Status updated to ${status}`, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating payment status' });
    }
};
