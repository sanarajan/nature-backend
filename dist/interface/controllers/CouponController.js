"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = void 0;
const CouponModel_1 = require("../../infrastructure/database/models/CouponModel");
class CouponController {
    async getActiveCoupons(req, res) {
        try {
            const now = new Date();
            const coupons = await CouponModel_1.CouponModel.find({
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).sort({ endDate: 1 });
            res.status(200).json({
                success: true,
                data: { coupons }
            });
        }
        catch (error) {
            console.error('Fetch Coupons Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
    async validateCoupon(req, res) {
        try {
            const { code, amount } = req.body;
            const now = new Date();
            const purchaseAmount = Number(amount);
            const coupon = await CouponModel_1.CouponModel.findOne({
                couponName: { $regex: new RegExp(`^${code}$`, 'i') },
                status: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            });
            if (!coupon) {
                res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
                return;
            }
            if (purchaseAmount < coupon.minPurchase) {
                res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required.` });
                return;
            }
            let discount = 0;
            if (coupon.discountType === 'Percentage') {
                discount = (amount * (coupon.discountPercentage || 0)) / 100;
            }
            else {
                discount = coupon.discountValue || 0;
            }
            res.status(200).json({
                success: true,
                data: {
                    coupon: {
                        _id: coupon._id,
                        couponName: coupon.couponName,
                        discountType: coupon.discountType,
                        discountValue: discount,
                        minPurchase: coupon.minPurchase
                    }
                }
            });
        }
        catch (error) {
            console.error('Validate Coupon Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
}
exports.CouponController = CouponController;
