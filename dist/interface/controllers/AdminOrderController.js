"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = void 0;
const OrderModel_1 = require("../../infrastructure/database/models/OrderModel");
const container_1 = require("../../infrastructure/config/container");
const EmailService_1 = require("../../infrastructure/services/EmailService");
const getAllOrders = async (req, res) => {
    try {
        console.log("reaching list order cont");
        const orders = await OrderModel_1.OrderModel.find()
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl' })
            .sort({ createdAt: -1 });
        // DYNAMIC SYNC: Ensure all orders have correct global status
        let updatedCount = 0;
        for (const order of orders) {
            const calculated = OrderModel_1.OrderModel.calculateGlobalStatus(order.orderedProducts);
            if (order.globalOrderStatus !== calculated) {
                console.log(`[DYNAMIC_SYNC] Correcting Order ${order.orderId}: "${order.globalOrderStatus}" -> "${calculated}"`);
                order.globalOrderStatus = calculated;
                await order.save();
                updatedCount++;
            }
        }
        if (updatedCount > 0)
            console.log(`[DYNAMIC_SYNC] Corrected ${updatedCount} orders during fetch.`);
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error fetching orders' });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await OrderModel_1.OrderModel.findById(id)
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // DYNAMIC SYNC: Ensure details view is always accurate
        const calculated = order.constructor.calculateGlobalStatus(order.orderedProducts);
        if (order.globalOrderStatus !== calculated) {
            console.log(`[DYNAMIC_SYNC] Correcting Order ${order.orderId} in detail view: "${order.globalOrderStatus}" -> "${calculated}"`);
            order.globalOrderStatus = calculated;
            await order.save();
        }
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching order details' });
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, productId, shippingDetails } = req.body;
        const order = await OrderModel_1.OrderModel.findById(id).populate('userId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const adminName = req.admin?.displayName || 'Admin';
        let updatedItemName = 'All Items';
        let shippedProduct = null;
        if (productId) {
            // Find the specific product
            const product = order.orderedProducts.find(p => p.productId.toString() === productId || p._id?.toString() === productId);
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
        }
        else {
            // Update status for all products in the order
            order.orderedProducts.forEach(product => {
                product.orderStatus = status;
                if (status === 'Cancelled') {
                    product.cancellation = {
                        reason: reason || 'Cancelled by Admin',
                        cancelDate: new Date()
                    };
                    product.cancelledBy = adminName;
                }
            });
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
            const user = order.userId;
            if (user.email) {
                try {
                    const emailService = container_1.container.resolve(EmailService_1.EmailService);
                    await emailService.sendShippingEmail(user.email, order.orderId, shippedProduct.productName, shippedProduct.shippingDetails.agencyName, shippedProduct.shippingDetails.trackingNumber, shippedProduct.shippingDetails.agencyUrl);
                }
                catch (emailError) {
                    console.error('Error resolving EmailService or sending email:', emailError);
                }
            }
        }
        // Repopulate user details for the frontend
        const updatedOrder = await OrderModel_1.OrderModel.findById(id)
            .populate({ path: 'userId', model: 'User', select: 'displayName email imageUrl phoneNumber' });
        res.status(200).json({ success: true, message: `Order status updated to ${status}`, data: updatedOrder });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating status' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
