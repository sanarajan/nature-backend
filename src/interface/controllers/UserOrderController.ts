import { Request, Response } from 'express';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { CartModel } from '../../infrastructure/database/models/CartModel';
import { AddressModel } from '../../infrastructure/database/models/AddressModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { CouponModel } from '../../infrastructure/database/models/CouponModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ShippingChargeModel } from '../../infrastructure/database/models/ShippingChargeModel';
import mongoose from 'mongoose';
import { RazorpayService } from '../../infrastructure/services/RazorpayService';
import crypto from 'crypto';

const razorpayService = new RazorpayService();

export class UserOrderController {
    public async placeOrder(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { addressId, paymentMethod, isOnline, referralCode, couponCode } = req.body;

            // Fetch Cart
            const cart = await CartModel.findOne({ user: userId, isActive: true }).populate('products.product');
            if (!cart || cart.products.length === 0) {
                res.status(400).json({ success: false, message: 'Cart is empty' });
                return;
            }

            // Fetch Address
            const addressDoc = await AddressModel.findById(addressId);
            if (!addressDoc) {
                res.status(404).json({ success: false, message: 'Shipping address not found' });
                return;
            }

            // Fetch all active offers
            const now = new Date();
            const activeOffers = await OfferModel.find({
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            });

            // Calculate Order Info
            let subTotal = 0;
            let totalOfferDiscount = 0;
            let hasActiveOffers = false;

            const orderedProducts = cart.products.map((item: any) => {
                const p = item.product;
                const originalPrice = p.price || 0;
                const qty = item.quantity || 1;
                subTotal += (originalPrice * qty);

                // Find Best Offer for this product (Product Offer vs Category Offer)
                let bestOffer: any = null;
                let maxDiscountPerUnit = 0;

                const applicableOffers = activeOffers.filter(offer =>
                    (offer.offerFor === 'product' && offer.products?.toString() === p._id.toString()) ||
                    (offer.offerFor === 'category' && offer.categories?.toString() === p.categoryId.toString())
                );

                applicableOffers.forEach(offer => {
                    let discountValue = 0;
                    if (offer.offerType === 'percentage') {
                        discountValue = (originalPrice * (offer.offerPercentage || 0)) / 100;
                    } else {
                        discountValue = offer.offerAmount || 0;
                    }

                    if (discountValue > maxDiscountPerUnit) {
                        maxDiscountPerUnit = discountValue;
                        bestOffer = offer;
                    }
                });

                const discountPerUnit = maxDiscountPerUnit;
                const offerPrice = originalPrice - discountPerUnit;
                const totalItemDiscount = discountPerUnit * qty;

                if (bestOffer) {
                    hasActiveOffers = true;
                    totalOfferDiscount += totalItemDiscount;
                }

                return {
                    productId: p._id,
                    productName: p.productName,
                    category: p.categoryId,
                    quantity: qty,
                    image: p.images && p.images.length > 0 ? p.images[0] : '',
                    price: originalPrice,
                    offerPercentage: bestOffer?.offerType === 'percentage' ? bestOffer.offerPercentage : undefined,
                    offerPrice: offerPrice,
                    discountOffer: totalItemDiscount, // The total discount applied to this product line
                    offerId: bestOffer?._id || null,
                    orderStatus: isOnline ? 'Pending' : 'Order Placed'
                };
            });

            // Exclusivity Rule: If ANY product has an active offer, block coupon/referral
            let finalDiscountAmount = totalOfferDiscount;
            let appliedReferralCode = '';
            let appliedReferralOwnerId: any = null;
            let appliedCouponId: any = null;
            let appliedCouponName: any = null;

            if (!hasActiveOffers) {
                // Only evaluate coupons/referrals if no product-level offers are active
                if (referralCode) {
                    const referrer = await UserModel.findOne({ referralId: referralCode });
                    if (referrer && referrer._id.toString() !== userId) {
                        const settings = await ReferralSettingModel.findOne({ isActive: true });
                        const discountPercent = settings?.offerPercentage || 20;
                        finalDiscountAmount = (subTotal * discountPercent) / 100;
                        appliedReferralCode = referralCode;
                        appliedReferralOwnerId = referrer._id;
                    }
                } else if (couponCode) {
                    const coupon = await CouponModel.findOne({
                        couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                        status: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now }
                    });

                    if (coupon) {
                        if (subTotal >= coupon.minPurchase) {
                            if (coupon.discountType === 'Percentage') {
                                finalDiscountAmount = (subTotal * (coupon.discountPercentage || 0)) / 100;
                            } else {
                                finalDiscountAmount = coupon.discountValue || 0;
                            }
                            appliedCouponId = coupon._id;
                            appliedCouponName = coupon.couponName;
                        } else {
                            res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required for coupon "${couponCode}"` });
                            return;
                        }
                    } else {
                        res.status(400).json({ success: false, message: `Invalid or expired coupon "${couponCode}"` });
                        return;
                    }
                }
            }

            // Fetch Shipping Charge for the state
            let deliveryCharge = 50; // Default
            const stateCharge = await ShippingChargeModel.findOne({
                state: { $regex: new RegExp(`^${addressDoc.state}$`, 'i') },
                isActive: true
            });

            if (stateCharge) {
                deliveryCharge = stateCharge.charge;
            }

            const totalAmount = subTotal + deliveryCharge - finalDiscountAmount;

            // Create Unique Order ID: ORD + 12 unique digits
            const random12 = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
            const orderId = `ORD${random12}`;

            // Construct Order Object
            const newOrder = new OrderModel({
                orderId: orderId,
                paymentMethod: isOnline ? 'Online' : (paymentMethod || 'COD'),
                paymentStatus: 'Pending',
                globalOrderStatus: isOnline ? 'PENDING' : 'PLACED',
                statusHistory: [{
                    status: isOnline ? 'Payment Pending' : 'Order Placed',
                    timestamp: new Date(),
                    updatedBy: 'Customer'
                }],
                address: {
                    house: addressDoc.house || '',
                    place: addressDoc.place || '',
                    city: addressDoc.city || '',
                    district: addressDoc.district || '',
                    state: addressDoc.state || '',
                    pincode: Number(addressDoc.pincode) || 0
                },
                deliveryCharge: deliveryCharge,
                userId: userId,
                totalPrice: subTotal,
                discount: finalDiscountAmount,
                totalAmount: totalAmount,
                referralCode: appliedReferralCode,
                referrerId: appliedReferralOwnerId,
                coupon: appliedCouponId,
                couponName: appliedCouponName,
                orderedProducts: orderedProducts
            });

            // Set placeholder for Razorpay logic block:
            // Handle Online Payment Initiation
            if (isOnline) {
                const razorpayOrder = await razorpayService.createOrder(totalAmount, orderId);
                newOrder.razorpayOrderId = razorpayOrder.id;
            }

            await newOrder.save();

            // Clear Cart after successful generic order creation (COD or Online initiation)
            cart.products = [];
            await cart.save();

            res.status(200).json({
                success: true,
                message: isOnline ? 'Payment initiated' : 'Order placed successfully',
                data: {
                    order: newOrder,
                    razorpayOrderId: newOrder.razorpayOrderId,
                    amount: Math.round(totalAmount * 100), // in paise
                    key_id: process.env.RAZORPAY_KEY_ID
                }
            });

        } catch (error: any) {
            console.error('Place Order Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Placing Order' });
        }
    }

    public async verifyPayment(req: Request, res: Response): Promise<void> {
        try {
            const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
            const secret = process.env.RAZORPAY_KEY_SECRET || "NuhGj1P30sdMmbn0MhA021uV";

            const order = await OrderModel.findOne({ orderId: orderId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            // Create a SHA256 hash of the razorpay_order_id and razorpay_payment_id
            const shasum = crypto.createHmac("sha256", secret);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest("hex");

            // Verify the signature
            if (digest !== razorpaySignature) {
                console.log("----Signature mismatch----");
                order.paymentStatus = "Failed";
                order.razorpayPaymentId = razorpayPaymentId;
                await order.save();
                res.status(400).json({
                    success: false,
                    message: "Payment verification failed due to signature mismatch",
                });
                return;
            }

            try {
                const payment: any = await razorpayService.razorpay.payments.fetch(razorpayPaymentId);

                if (payment.status !== "captured") {
                    console.log("Non-success Payment Status: ", payment.status);
                    order.paymentStatus = (payment.status === 'failed' ? 'Failed' : 'Pending') as any;
                    order.razorpayPaymentId = razorpayPaymentId;
                    await order.save();
                    res.status(400).json({
                        success: false,
                        message: `Payment was not successful (Status: ${payment.status})`,
                    });
                    return;
                }

                order.razorpayPaymentId = razorpayPaymentId;
                order.razorpayOrderId = razorpayOrderId;
                order.razorpaySignature = razorpaySignature;
                order.paymentStatus = "Completed";
                order.globalOrderStatus = "PLACED";

                // Update all product statuses to 'Order Placed'
                order.orderedProducts.forEach(product => {
                    if ((product.orderStatus as string) === 'Pending') {
                        product.orderStatus = 'Order Placed';
                    }
                });

                order.statusHistory.push({
                    status: 'Payment Verified & Order Placed',
                    timestamp: new Date(),
                    updatedBy: 'System'
                });

                await order.save();

                res.status(200).json({
                    success: true,
                    message: "Payment verified successfully",
                    orderId: order.orderId,
                });
            } catch (error) {
                console.error("Error fetching payment details:", error);
                res.status(500).send("Error updating order status");
            }

        } catch (error: any) {
            console.error('Verify Payment Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Verifying Payment' });
        }
    }

    public async handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
        try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';
            const signature = req.headers['x-razorpay-signature'] as string;

            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.warn('Invalid webhook signature');
                res.status(400).json({ success: false });
                return;
            }

            const event = req.body.event;
            const payload = req.body.payload;

            if (event === 'payment.captured' || event === 'order.paid') {
                const entity = payload.payment?.entity || payload.order?.entity;
                // Try several ways to find the order ID
                const razorpayOrderId = entity.order_id || entity.id;

                const order = await OrderModel.findOne({ razorpayOrderId: razorpayOrderId });
                if (order && order.paymentStatus === 'Pending') {
                    order.paymentStatus = 'Completed';
                    order.globalOrderStatus = 'PLACED';
                    order.razorpayPaymentId = entity.id;

                    order.orderedProducts.forEach(product => {
                        if ((product.orderStatus as string) === 'Pending') {
                            product.orderStatus = 'Order Placed';
                        }
                    });

                    order.statusHistory.push({
                        status: 'Payment Captured via Webhook',
                        timestamp: new Date(),
                        updatedBy: 'Razorpay'
                    });

                    await order.save();
                }
            } else if (event === 'payment.failed') {
                const entity = payload.payment.entity;
                const razorpayOrderId = entity.order_id;
                const order = await OrderModel.findOne({ razorpayOrderId: razorpayOrderId });
                if (order) {
                    order.paymentStatus = 'Failed';
                    order.statusHistory.push({
                        status: 'Payment Failed via Webhook',
                        timestamp: new Date(),
                        updatedBy: 'Razorpay'
                    });
                    await order.save();
                }
            } else if (event === 'refund.created') {
                const entity = payload.refund.entity;
                const razorpayPaymentId = entity.payment_id;
                const order = await OrderModel.findOne({ razorpayPaymentId: razorpayPaymentId });
                if (order) {
                    order.statusHistory.push({
                        status: `Refund Created via Webhook: ${entity.id}`,
                        timestamp: new Date(),
                        updatedBy: 'Razorpay'
                    });
                    await order.save();
                }
            }

            res.status(200).json({ status: 'ok' });
        } catch (error: any) {
            console.error('Webhook Error:', error);
            res.status(500).json({ status: 'error' });
        }
    }

    public async getOrders(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                data: { orders }
            });
        } catch (error: any) {
            console.error('Get Orders Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Fetching Orders' });
        }
    }

    public async getOrderDetails(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id;

            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: { order }
            });
        } catch (error: any) {
            console.error('Get Order Details Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Fetching Order Details' });
        }
    }

    public async requestCancellation(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id;
            const { reason } = req.body;

            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            // Restriction: Cannot cancel if any item is shipped or beyond
            const restrictedStatuses = ['SHIPPED', 'PARTIALLY_SHIPPED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'RETURNED', 'PARTIALLY_RETURNED'];
            if (restrictedStatuses.includes(order.globalOrderStatus)) {
                res.status(400).json({ success: false, message: 'Order cannot be cancelled as it has already been shipped or processed further.' });
                return;
            }

            // Map through all orderedProducts that are logically cancellable and set to "Cancellation Request".
            let updated = false;
            order.orderedProducts.forEach((item: any) => {
                if (item.orderStatus === 'Order Placed' || item.orderStatus === 'Processing' || item.orderStatus === 'Pending') {
                    item.orderStatus = 'Cancellation Request';
                    if (!item.cancellation) item.cancellation = {};
                    item.cancellation.reason = reason || 'User requested cancellation';
                    item.cancellation.cancelDate = new Date();
                    item.cancelledBy = 'User';
                    updated = true;
                }
            });

            if (!updated) {
                res.status(400).json({ success: false, message: 'No eligible items to cancel in this order.' });
                return;
            }

            await order.save();
            res.status(200).json({
                success: true,
                message: 'Cancellation requested safely. Admin will review process securely.',
                data: { order }
            });

        } catch (error: any) {
            console.error('Request Cancellation Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Cancellation' });
        }
    }

    public async requestItemCancellation(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { id: orderId, productId } = req.params;
            const { reason } = req.body;

            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
            if (!item) {
                res.status(404).json({ success: false, message: 'Item not found in this order' });
                return;
            }

            // Restriction: Cannot cancel if any item is shipped or beyond
            const restrictedStatuses = ['SHIPPED', 'PARTIALLY_SHIPPED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'RETURNED', 'PARTIALLY_RETURNED'];
            if (restrictedStatuses.includes(order.globalOrderStatus)) {
                res.status(400).json({ success: false, message: 'Item cannot be cancelled as the order has already been shipped or processed further.' });
                return;
            }

            if (item.orderStatus !== 'Order Placed' && item.orderStatus !== 'Processing' && item.orderStatus !== 'Pending') {
                res.status(400).json({ success: false, message: `Item cannot be cancelled in its current status: ${item.orderStatus}` });
                return;
            }

            item.orderStatus = 'Cancellation Request';
            if (!item.cancellation) item.cancellation = {};
            item.cancellation.reason = reason || 'User requested cancellation';
            item.cancellation.cancelDate = new Date();
            item.cancelledBy = 'User';

            // Update Global Status
            order.globalOrderStatus = order.calculateGlobalOrderStatus();

            order.statusHistory.push({
                status: `Item Cancellation Requested: ${item.productName}`,
                timestamp: new Date(),
                updatedBy: 'User'
            });

            await order.save();
            res.status(200).json({
                success: true,
                message: 'Item cancellation request submitted successfully.',
                data: { order }
            });
        } catch (error: any) {
            console.error('Request Item Cancellation Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Item Cancellation' });
        }
    }

    private isEligibleForReturn(item: any, order: any): boolean {
        if (item.orderStatus !== 'Delivered') return false;

        const historyEntry = order.statusHistory.slice().reverse().find((h: any) =>
            h.status.includes('Delivered') && (h.status.includes(item.productName) || h.status.includes('All Items'))
        );

        if (!historyEntry) return true; // Fallback if history missing, allow for safety

        const deliveryDate = new Date(historyEntry.timestamp);
        const now = new Date();
        const diffDays = (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);

        return diffDays <= 7;
    }

    public async requestReturn(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const orderId = req.params.id;
            const { reason } = req.body;

            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            let updatedItems: string[] = [];
            order.orderedProducts.forEach((item: any) => {
                if (this.isEligibleForReturn(item, order)) {
                    item.orderStatus = 'Return Request';
                    if (!item.cancellation) item.cancellation = {};
                    item.cancellation.reason = reason || 'User requested return';
                    item.cancellation.cancelDate = new Date();
                    updatedItems.push(item.productName);
                }
            });

            if (updatedItems.length === 0) {
                res.status(400).json({ success: false, message: 'No eligible items to return (must be within 7 days of delivery).' });
                return;
            }

            // Update Global Status
            order.globalOrderStatus = order.calculateGlobalOrderStatus();

            order.statusHistory.push({
                status: `Return requested for: ${updatedItems.join(', ')}`,
                timestamp: new Date(),
                updatedBy: 'User'
            });

            await order.save();
            res.status(200).json({
                success: true,
                message: `Return request submitted for ${updatedItems.length} item(s).`,
                data: { order }
            });
        } catch (error: any) {
            console.error('Request Return Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Return' });
        }
    }

    public async requestItemReturn(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { id: orderId, productId } = req.params;
            const { reason } = req.body;

            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            const item = order.orderedProducts.find((p: any) => p._id.toString() === productId);
            if (!item) {
                res.status(404).json({ success: false, message: 'Item not found in this order' });
                return;
            }

            if (!this.isEligibleForReturn(item, order)) {
                res.status(400).json({ success: false, message: 'Item is not eligible for return. It must be in "Delivered" status and within 7 days of delivery.' });
                return;
            }

            item.orderStatus = 'Return Request';
            if (!item.cancellation) item.cancellation = {};
            item.cancellation.reason = reason || 'User requested return';
            item.cancellation.cancelDate = new Date();

            // Update Global Status
            order.globalOrderStatus = order.calculateGlobalOrderStatus();

            order.statusHistory.push({
                status: `Item Return Requested: ${item.productName}`,
                timestamp: new Date(),
                updatedBy: 'User'
            });

            await order.save();
            res.status(200).json({
                success: true,
                message: 'Item return request submitted successfully.',
                data: { order }
            });
        } catch (error: any) {
            console.error('Request Item Return Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Item Return' });
        }
    }

    public async getShippingCharge(req: Request, res: Response): Promise<void> {
        try {
            const { state } = req.params;
            const charge = await ShippingChargeModel.findOne({
                state: { $regex: new RegExp(`^${state}$`, 'i') },
                isActive: true
            });

            if (charge) {
                res.status(200).json({ success: true, data: charge });
            } else {
                res.status(404).json({ success: false, message: 'No custom charge for this state' });
            }
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
