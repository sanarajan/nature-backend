import { Request, Response } from 'express';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { CartModel } from '../../infrastructure/database/models/CartModel';
import { AddressModel } from '../../infrastructure/database/models/AddressModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { CouponModel } from '../../infrastructure/database/models/CouponModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { ShippingChargeModel } from '../../infrastructure/database/models/ShippingChargeModel';
import mongoose from 'mongoose';
import { IRazorpayService } from '../../domain/services/IRazorpayService';
import crypto from 'crypto';
import { inject, injectable } from 'tsyringe';

const roundTo2 = (num: number) => Math.round(num * 100) / 100;

@injectable()
export class UserOrderController {
    constructor(
        @inject('IRazorpayService') private razorpayService: IRazorpayService
    ) { }

    public async placeOrder(req: Request, res: Response): Promise<void> {
        try {
            console.log("place order entry")
            const userId = (req as any).user.id;
            const { addressId, paymentMethod, isOnline, referralCode, couponCode } = req.body;

            // Fetch Cart
            const cart = await CartModel.findOne({ user: userId, isActive: true })
                .populate({
                    path: 'products.product',
                    populate: [
                        { path: 'categoryId', select: 'categoryName _id' },
                        { path: 'subcategoryId', select: 'subcategoryName _id' }
                    ]
                });
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

            const now = new Date();

            // Fetch all active Combo Offers
            const activeComboOffers = await ComboOfferModel.find({
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).populate('products.productId');

            // Fetch all active Product/Category Offers
            const activeOffers = await OfferModel.find({
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            });

            // Calculate Order Info
            let subTotal = 0;
            let totalOfferDiscount = 0;
            let appliedComboOfferId: any = null;
            let appliedComboOfferName: string = '';
            let hasActiveOffers = false;
            let hasComboOffer = false;

            // 1. Check for Best Combo Offer (Priority 1)
            let bestCombo: any = null;
            let bestComboDiscount = 0;
            let applications = 0;

            for (const combo of activeComboOffers) {
                let isComboMet = true;
                let comboSetMRP = 0;

                if (!combo.products || !Array.isArray(combo.products)) continue;

                const requirements: Record<string, number> = {};
                for (const cp of combo.products) {
                    const prodDoc: any = cp.productId;
                    const pId = prodDoc?._id?.toString() || cp.productId?.toString();
                    if (!pId) continue;
                    requirements[pId] = (requirements[pId] || 0) + cp.requiredQuantity;
                    
                    const price = Number(prodDoc?.price) || 0;
                    comboSetMRP += price * cp.requiredQuantity;
                }

                const requiredPIds = Object.keys(requirements);
                if (requiredPIds.length === 0) continue;

                // Match check
                for (const pId of requiredPIds) {
                    const cartItem = cart.products.find((cp: any) => cp.product?._id?.toString() === pId);
                    if (!cartItem || cartItem.quantity < requirements[pId]) {
                        isComboMet = false;
                        break;
                    }
                }

                if (isComboMet) {
                    let possibleApps = Infinity;
                    for (const pId of requiredPIds) {
                        const cartItem = cart.products.find((i: any) => i.product?._id?.toString() === pId);
                        if (!cartItem) continue; // Should not happen due to match check above
                        const appsForThisProd = Math.floor(cartItem.quantity / requirements[pId]);
                        possibleApps = Math.min(possibleApps, appsForThisProd);
                    }

                    if (possibleApps > 0 && possibleApps !== Infinity) {
                        let combosToApply = possibleApps;
                        if (combo.maxUsagePerOrder && combo.maxUsagePerOrder > 0) {
                            combosToApply = Math.min(possibleApps, combo.maxUsagePerOrder);
                        }

                        let discount = 0;
                        const comboBaseAmount = roundTo2(comboSetMRP * combosToApply);

                        if (combo.discountType === 'percentage') {
                            discount = roundTo2((comboBaseAmount * (combo.discountValue || 0)) / 100);
                        } else {
                            discount = roundTo2((combo.discountValue || 0) * combosToApply);
                        }

                        if (discount > bestComboDiscount) {
                            bestComboDiscount = discount;
                            bestCombo = combo;
                            applications = combosToApply;
                            hasComboOffer = true;
                        }
                    }
                }
            }

            if (bestCombo) {
                appliedComboOfferId = bestCombo._id;
                appliedComboOfferName = bestCombo.offerName;
            }

            // 2. Pre-calculate Distribution Record
            const comboDistributions: Record<string, number> = {};
            if (bestCombo && applications > 0) {
                let remainingComboDiscount = bestComboDiscount;
                const itemsToDistribute: any[] = [];
                let actualUsedMRPTotal = 0;

                cart.products.forEach((item: any) => {
                    const pIdString = item.product?._id?.toString();
                    if (!pIdString) return;

                    const reqPerSet = bestCombo.products.reduce((acc: number, cp: any) => {
                        const cpId = cp.productId?._id?.toString() || cp.productId?.toString();
                        return cpId === pIdString ? acc + cp.requiredQuantity : acc;
                    }, 0);

                    if (reqPerSet > 0) {
                        const usedQty = reqPerSet * applications;
                        const price = Number(item.product?.price) || 0;
                        const usedMRP = roundTo2(price * usedQty);
                        actualUsedMRPTotal += usedMRP;
                        itemsToDistribute.push({ pId: pIdString, usedMRP });
                    }
                });

                itemsToDistribute.forEach((item, idx) => {
                    if (idx === itemsToDistribute.length - 1) {
                        comboDistributions[item.pId] = roundTo2(remainingComboDiscount);
                    } else {
                        const share = roundTo2((item.usedMRP / actualUsedMRPTotal) * bestComboDiscount);
                        comboDistributions[item.pId] = share;
                        remainingComboDiscount = roundTo2(remainingComboDiscount - share);
                    }
                });
            }

            let totalMRP = 0;
            let grandTotalDiscount = 0;
            let hasProductOfferFlag = false;

            const comboProductIds = new Set(
                bestCombo?.products.map((p: any) =>
                    p.productId?._id?.toString() || p.productId?.toString()
                )
            );

            const orderedProducts = cart.products
                .filter((item: any) => item.product)
                .map((item: any) => {
                const p = item.product as any;
                const originalPrice = Number(p?.price) || 0;
                const totalQty = item.quantity || 1;
                totalMRP += (originalPrice * totalQty);
                const pIdString = p?._id?.toString();

                let qtyInCombo = 0;
                if (bestCombo) {
                    const reqPerSet = bestCombo.products.reduce((acc: number, cp: any) => {
                        const cpId = cp.productId?._id?.toString() || cp.productId?.toString();
                        return cpId === pIdString ? acc + cp.requiredQuantity : acc;
                    }, 0);
                    qtyInCombo = reqPerSet * applications;
                }

                const qtyEligibleForIndividualOffer = totalQty - qtyInCombo;
                const discounts: any = {};
                let productTotalDiscount = 0;

                // Combo Discount Share
                if (qtyInCombo > 0) {
                    const share = comboDistributions[pIdString] || 0;
                    discounts.comboOffer = {
                        offerId: bestCombo._id,
                        offerName: bestCombo.offerName,
                        discountAmount: share
                    };
                    productTotalDiscount += share;
                }

                // Individual Offers (Product/Category) for remaining quantities
                // BUSINESS RULE: Individual offers are disabled if this product is part of the applied combo
                if (!comboProductIds.has(pIdString) && qtyEligibleForIndividualOffer > 0) {
                    let bestProductOffer: any = null;
                    let bestCategoryOffer: any = null;
                    
                    const applicableOffers = activeOffers.filter(offer =>
                        (offer.offerFor === 'product' && offer.productId?.toString() === p._id?.toString()) ||
                        (offer.offerFor === 'category' && offer.categoryId?.toString() === p.categoryId?.toString())
                    );

                    applicableOffers.forEach(offer => {
                        let discountAmt = 0;
                        if (offer.discountType === 'percentage') {
                            discountAmt = (originalPrice * (offer.discountValue || 0)) / 100;
                        } else {
                            discountAmt = offer.discountValue || 0;
                        }

                        if (offer.offerFor === 'product') {
                            if (!bestProductOffer || discountAmt > (bestProductOffer.amt || 0)) {
                                bestProductOffer = { offer, amt: discountAmt };
                            }
                        } else {
                            if (!bestCategoryOffer || discountAmt > (bestCategoryOffer.amt || 0)) {
                                bestCategoryOffer = { offer, amt: discountAmt };
                            }
                        }
                    });

                    if (bestProductOffer) {
                        const amt = Math.round(bestProductOffer.amt * qtyEligibleForIndividualOffer);
                        discounts.productOffer = {
                            offerId: bestProductOffer.offer._id,
                            offerName: bestProductOffer.offer.offerName,
                            discountAmount: amt
                        };
                        productTotalDiscount += amt;
                        hasProductOfferFlag = true;
                    }

                    if (bestCategoryOffer) {
                        const amt = Math.round(bestCategoryOffer.amt * qtyEligibleForIndividualOffer);
                        discounts.categoryOffer = {
                            offerId: bestCategoryOffer.offer._id,
                            offerName: bestCategoryOffer.offer.offerName,
                            discountAmount: amt
                        };
                        productTotalDiscount += amt;
                        hasProductOfferFlag = true;
                    }
                }

                grandTotalDiscount += productTotalDiscount;
                const finalPricePerUnit = ( (originalPrice * totalQty) - productTotalDiscount ) / totalQty;

                return {
                    productId: p._id,
                    productName: p.productName,
                    category: p.categoryId,
                    quantity: totalQty,
                    image: p.images && p.images.length > 0 ? p.images[0] : '',
                    price: originalPrice,
                    finalPrice: finalPricePerUnit,
                    discounts: discounts,
                    orderStatus: isOnline ? 'Pending' : 'Order Placed'
                };
            });

            // REJECTION RULE: If ANY offer exists (Combo or Individual), reject coupon/referral
            if ((hasComboOffer || hasProductOfferFlag) && (couponCode || referralCode)) {
                res.status(400).json({ 
                    success: false, 
                    message: "Coupon or referral cannot be applied when an active offer exists." 
                });
                return;
            }

            // 3. Final Calculations
            let finalDiscountAmount = grandTotalDiscount;
            let appliedReferralCode = '';
            let appliedReferralOwnerId: any = null;
            let appliedCouponId: any = null;
            let appliedCouponName: any = null;

            if (!hasComboOffer && !hasProductOfferFlag) {
                if (referralCode) {
                    const referrer = await UserModel.findOne({ referralId: referralCode });
                    if (referrer && referrer._id.toString() !== userId) {
                        const settings = await ReferralSettingModel.findOne({ isActive: true });
                        const discountPercent = settings?.offerPercentage || 20;
                        finalDiscountAmount = (totalMRP * discountPercent) / 100;
                        appliedReferralCode = referralCode;
                        appliedReferralOwnerId = referrer._id;
                        
                        // Distribute referral discount proportionally to finalPrice if needed
                        // For now we just use the global discount as before but labeled in Order
                    }
                } else if (couponCode) {
                    const coupon = await CouponModel.findOne({
                        couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                        status: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now }
                    });

                    if (coupon) {
                        if (totalMRP >= coupon.minPurchase) {
                            if (coupon.discountType === 'Percentage') {
                                finalDiscountAmount = (totalMRP * (coupon.discountPercentage || 0)) / 100;
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

            const totalAmount = totalMRP + deliveryCharge - finalDiscountAmount;

            // appliedOffersSummary
            let summary = "";
            if (hasComboOffer) summary += `Combo: ${bestCombo.offerName} `;
            if (hasProductOfferFlag) summary += `Product/Category Offers Applied `;
            if (appliedCouponName) summary += `Coupon: ${appliedCouponName} `;
            if (appliedReferralCode) summary += `Referral: ${appliedReferralCode} `;

            // Check for existing pending order before creating a new one
            const targetPaymentMethod = isOnline ? 'Online' : (paymentMethod || 'COD');
            const existingPendingOrder = await OrderModel.findOne({ 
                userId, 
                paymentStatus: { $in: ['Pending', 'Failed'] }, 
                globalOrderStatus: 'PENDING',
                paymentMethod: targetPaymentMethod
            }).sort({ createdAt: -1 });

            let useExistingOrder: any = null;

            if (existingPendingOrder) {
                const isSame = 
                    existingPendingOrder.totalAmount === totalAmount &&
                    existingPendingOrder.totalMRP === totalMRP &&
                    existingPendingOrder.deliveryCharge === deliveryCharge &&
                    existingPendingOrder.totalDiscount === finalDiscountAmount &&
                    existingPendingOrder.address?.pincode === Number(addressDoc.pincode) &&
                    existingPendingOrder.orderedProducts.length === orderedProducts.length &&
                    existingPendingOrder.orderedProducts.every((ep: any) => {
                        const newP = orderedProducts.find((np: any) => np.productId?.toString() === ep.productId?.toString());
                        return newP && newP.quantity === ep.quantity && newP.finalPrice === ep.finalPrice;
                    });

                if (isSame) {
                    useExistingOrder = existingPendingOrder;
                    useExistingOrder.paymentStatus = 'Pending';
                } else {
                    existingPendingOrder.globalOrderStatus = 'Expired';
                    existingPendingOrder.paymentStatus = 'Expired';
                    existingPendingOrder.orderedProducts.forEach((p: any) => {
                        p.orderStatus = 'Expired';
                    });
                    existingPendingOrder.statusHistory.push({
                        status: 'Expired due to cart/address change on retry',
                        timestamp: new Date(),
                        updatedBy: 'System'
                    });
                    await existingPendingOrder.save();
                }
            }

            let newOrder: any = useExistingOrder;

            if (!newOrder) {
                // Create Unique Order ID: ORD + 12 unique digits
                const random12 = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                const orderId = `ORD${random12}`;

                // Construct Order Object
                newOrder = new OrderModel({
                    orderId: orderId,
                    paymentMethod: targetPaymentMethod,
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
                    totalMRP: totalMRP,
                    totalDiscount: finalDiscountAmount,
                    comboOffer: appliedComboOfferId,
                    comboOfferName: appliedComboOfferName,
                    totalAmount: totalAmount,
                    referralCode: appliedReferralCode,
                    referrerId: appliedReferralOwnerId,
                    coupon: appliedCouponId,
                    couponName: appliedCouponName,
                    hasComboOffer: hasComboOffer,
                    hasProductOffer: hasProductOfferFlag,
                    appliedOffersSummary: summary.trim(),
                    orderedProducts: orderedProducts
                });
            }

            // Handle Online Payment Initiation
            if (isOnline) {
                const razorpayOrder = await this.razorpayService.createOrder(totalAmount, newOrder.orderId);
                console.log(razorpayOrder, "razorpay order  testforpayment")
                newOrder.razorpayOrderId = razorpayOrder.id;
            }

            await newOrder.save();

            // Clear Cart after successful generic order creation if COD. 
            // Online orders clear it upon successful verification to allow retry.
            if (!isOnline) {
                cart.products = [];
                await cart.save();
            }

            res.status(200).json({
                success: true,
                message: isOnline ? (useExistingOrder ? 'Payment initiated (Retry)' : 'Payment initiated') : 'Order placed successfully',
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
            console.log("reached razor secret from checkou")

            const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
            const secret = process.env.RAZORPAY_KEY_SECRET || "NuhGj1P30sdMmbn0MhA021uV";
console.log(secret,"razor secret from checkou")
            const order = await OrderModel.findOne({ orderId: orderId });
            if (!order) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            // Create a SHA256 hash of the razorpay_order_id and razorpay_payment_id
            const shasum = crypto.createHmac("sha256", secret);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest("hex");
console.log(digest,"digest")
console.log(razorpaySignature,"razorpaySignature")

            // Verify the signature
            if (digest !== razorpaySignature) {
                console.error(`[VerifyPayment] Signature mismatch for order ${orderId}`);
                order.paymentStatus = "Failed";
                order.razorpayPaymentId = razorpayPaymentId;
                order.statusHistory.push({
                    status: 'Payment Verification Failed (Signature Mismatch)',
                    timestamp: new Date(),
                    updatedBy: 'System'
                });
                await order.save();
                res.status(400).json({
                    success: false,
                    message: "Payment verification failed due to signature mismatch",
                });
                return;
            }

            console.log(`[VerifyPayment] Signature verified for order ${orderId}. Fetching details...`);

            try {
                const payment: any = await this.razorpayService.fetchPayment(razorpayPaymentId);

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
                order.globalOrderStatus = "PLACED"; // Order is now officially placed after payment
                console.log(`[VerifyPayment] Payment captured. Saving IDs to order ${orderId}`);

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

                // Clear cart after successful online payment
                const cart = await CartModel.findOne({ user: order.userId, isActive: true });
                if (cart) {
                    cart.products = [];
                    await cart.save();
                }

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

                    // Clear cart
                    const cart = await CartModel.findOne({ user: order.userId, isActive: true });
                    if (cart) {
                        cart.products = [];
                        await cart.save();
                    }
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
