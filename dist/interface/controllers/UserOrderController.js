"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrderController = void 0;
const OrderModel_1 = require("../../infrastructure/database/models/OrderModel");
const CartModel_1 = require("../../infrastructure/database/models/CartModel");
const AddressModel_1 = require("../../infrastructure/database/models/AddressModel");
const ReferralSettingModel_1 = require("../../infrastructure/database/models/ReferralSettingModel");
const UserModel_1 = require("../../infrastructure/database/models/UserModel");
const CouponModel_1 = require("../../infrastructure/database/models/CouponModel");
const OfferModel_1 = require("../../infrastructure/database/models/OfferModel");
class UserOrderController {
    async placeOrder(req, res) {
        try {
            const userId = req.user.id;
            const { addressId, paymentMethod, isOnline, referralCode, couponCode } = req.body;
            // Fetch Cart
            const cart = await CartModel_1.CartModel.findOne({ user: userId, isActive: true }).populate('products.product');
            if (!cart || cart.products.length === 0) {
                res.status(400).json({ success: false, message: 'Cart is empty' });
                return;
            }
            // Fetch Address
            const addressDoc = await AddressModel_1.AddressModel.findById(addressId);
            if (!addressDoc) {
                res.status(404).json({ success: false, message: 'Shipping address not found' });
                return;
            }
            // Fetch all active offers
            const now = new Date();
            const activeOffers = await OfferModel_1.OfferModel.find({
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            });
            // Calculate Order Info
            let subTotal = 0;
            let totalOfferDiscount = 0;
            let hasActiveOffers = false;
            const orderedProducts = cart.products.map((item) => {
                const p = item.product;
                const originalPrice = p.price || 0;
                const qty = item.quantity || 1;
                subTotal += (originalPrice * qty);
                // Find Best Offer for this product (Product Offer vs Category Offer)
                let bestOffer = null;
                let maxDiscountPerUnit = 0;
                const applicableOffers = activeOffers.filter(offer => (offer.offerFor === 'product' && offer.products?.toString() === p._id.toString()) ||
                    (offer.offerFor === 'category' && offer.categories?.toString() === p.categoryId.toString()));
                applicableOffers.forEach(offer => {
                    let discountValue = 0;
                    if (offer.offerType === 'percentage') {
                        discountValue = (originalPrice * (offer.offerPercentage || 0)) / 100;
                    }
                    else {
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
                    orderStatus: 'Order Placed'
                };
            });
            // Exclusivity Rule: If ANY product has an active offer, block coupon/referral
            let finalDiscountAmount = totalOfferDiscount;
            let appliedReferralCode = '';
            let appliedReferralOwnerId = null;
            let appliedCouponId = null;
            let appliedCouponName = null;
            if (!hasActiveOffers) {
                // Only evaluate coupons/referrals if no product-level offers are active
                if (referralCode) {
                    const referrer = await UserModel_1.UserModel.findOne({ referralId: referralCode });
                    if (referrer && referrer._id.toString() !== userId) {
                        const settings = await ReferralSettingModel_1.ReferralSettingModel.findOne({ isActive: true });
                        const discountPercent = settings?.offerPercentage || 20;
                        finalDiscountAmount = (subTotal * discountPercent) / 100;
                        appliedReferralCode = referralCode;
                        appliedReferralOwnerId = referrer._id;
                    }
                }
                else if (couponCode) {
                    const coupon = await CouponModel_1.CouponModel.findOne({
                        couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                        status: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now }
                    });
                    if (coupon) {
                        if (subTotal >= coupon.minPurchase) {
                            if (coupon.discountType === 'Percentage') {
                                finalDiscountAmount = (subTotal * (coupon.discountPercentage || 0)) / 100;
                            }
                            else {
                                finalDiscountAmount = coupon.discountValue || 0;
                            }
                            appliedCouponId = coupon._id;
                            appliedCouponName = coupon.couponName;
                        }
                        else {
                            res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required for coupon "${couponCode}"` });
                            return;
                        }
                    }
                    else {
                        res.status(400).json({ success: false, message: `Invalid or expired coupon "${couponCode}"` });
                        return;
                    }
                }
            }
            const deliveryCharge = subTotal > 0 && subTotal < 599 ? 50 : 0;
            const totalAmount = subTotal + deliveryCharge - finalDiscountAmount;
            // Create Unique Order ID: ORD + 12 unique digits
            const random12 = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
            const orderId = `ORD${random12}`;
            // Construct Order Object
            const newOrder = new OrderModel_1.OrderModel({
                orderId: orderId,
                paymentMethod: isOnline ? 'Online' : (paymentMethod || 'COD'),
                paymentStatus: 'Pending',
                statusHistory: [{ status: 'Order Placed', timestamp: new Date(), updatedBy: 'Customer' }],
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
            if (isOnline) {
                // Here future developer will integrate Razorpay backend generating an order mapping and return it.
                // For now, we simulate online pending behaviour.
            }
            await newOrder.save();
            // Clear Cart after successful generic order creation (COD or Online initiation)
            cart.products = [];
            await cart.save();
            res.status(200).json({
                success: true,
                message: 'Order placed successfully',
                data: { order: newOrder }
            });
        }
        catch (error) {
            console.error('Place Order Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Placing Order' });
        }
    }
    async getOrders(req, res) {
        try {
            const userId = req.user.id;
            const orders = await OrderModel_1.OrderModel.find({ userId }).sort({ createdAt: -1 });
            res.status(200).json({
                success: true,
                data: { orders }
            });
        }
        catch (error) {
            console.error('Get Orders Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Fetching Orders' });
        }
    }
    async getOrderDetails(req, res) {
        try {
            const userId = req.user.id;
            const orderId = req.params.id;
            const order = await OrderModel_1.OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: { order }
            });
        }
        catch (error) {
            console.error('Get Order Details Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Fetching Order Details' });
        }
    }
    async requestCancellation(req, res) {
        try {
            const userId = req.user.id;
            const orderId = req.params.id;
            const { reason } = req.body;
            const order = await OrderModel_1.OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }
            // Map through all orderedProducts that are logically cancellable and set to "Pending Cancellation".
            let updated = false;
            order.orderedProducts.forEach((item) => {
                if (item.orderStatus === 'Order Placed' || item.orderStatus === 'Processing') {
                    item.orderStatus = 'Pending Cancellation';
                    if (!item.cancellation)
                        item.cancellation = {};
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
        }
        catch (error) {
            console.error('Request Cancellation Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Cancellation' });
        }
    }
    async requestItemCancellation(req, res) {
        try {
            const userId = req.user.id;
            const { id: orderId, productId } = req.params;
            const { reason } = req.body;
            const order = await OrderModel_1.OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }
            const item = order.orderedProducts.find((p) => p._id.toString() === productId);
            if (!item) {
                res.status(404).json({ success: false, message: 'Item not found in this order' });
                return;
            }
            if (item.orderStatus !== 'Order Placed' && item.orderStatus !== 'Processing') {
                res.status(400).json({ success: false, message: `Item cannot be cancelled in its current status: ${item.orderStatus}` });
                return;
            }
            item.orderStatus = 'Pending Cancellation';
            if (!item.cancellation)
                item.cancellation = {};
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
        }
        catch (error) {
            console.error('Request Item Cancellation Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Item Cancellation' });
        }
    }
    async requestReturn(req, res) {
        try {
            const userId = req.user.id;
            const orderId = req.params.id;
            const { reason } = req.body;
            const order = await OrderModel_1.OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }
            let updated = false;
            order.orderedProducts.forEach((item) => {
                if (item.orderStatus === 'Delivered') {
                    item.orderStatus = 'Return';
                    if (!item.cancellation)
                        item.cancellation = {};
                    item.cancellation.reason = reason || 'User requested return';
                    item.cancellation.cancelDate = new Date();
                    updated = true;
                }
            });
            if (!updated) {
                res.status(400).json({ success: false, message: 'No eligible items to return.' });
                return;
            }
            await order.save();
            res.status(200).json({
                success: true,
                message: 'Return request submitted successfully.',
                data: { order }
            });
        }
        catch (error) {
            console.error('Request Return Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Return' });
        }
    }
    async requestItemReturn(req, res) {
        try {
            const userId = req.user.id;
            const { id: orderId, productId } = req.params;
            const { reason } = req.body;
            const order = await OrderModel_1.OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }
            const item = order.orderedProducts.find((p) => p._id.toString() === productId);
            if (!item) {
                res.status(404).json({ success: false, message: 'Item not found in this order' });
                return;
            }
            if (item.orderStatus !== 'Delivered') {
                res.status(400).json({ success: false, message: `Item cannot be returned in its current status: ${item.orderStatus}` });
                return;
            }
            item.orderStatus = 'Return';
            if (!item.cancellation)
                item.cancellation = {};
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
        }
        catch (error) {
            console.error('Request Item Return Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error Processing Item Return' });
        }
    }
}
exports.UserOrderController = UserOrderController;
