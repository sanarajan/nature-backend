"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCouponStatus = exports.deleteCoupon = exports.updateCoupon = exports.getCouponById = exports.getAllCoupons = exports.addCoupon = void 0;
const CouponModel_1 = require("../../infrastructure/database/models/CouponModel");
const cloudinary_1 = __importDefault(require("../../infrastructure/config/cloudinary"));
const addCoupon = async (req, res) => {
    try {
        const { couponName, couponImage, startDate, endDate, description, minPurchase, discountType, discountPercentage, discountValue, status, userUsageLimit } = req.body;
        if (!couponName || !startDate || !endDate || !description || !minPurchase || !discountType) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const existingCoupon = await CouponModel_1.CouponModel.findOne({
            couponName: { $regex: new RegExp(`^${couponName.trim()}$`, 'i') }
        });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon with this name already exists' });
        }
        const uploadedImages = [];
        if (couponImage && Array.isArray(couponImage)) {
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary_1.default.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    uploadedImages.push(uploadRes.secure_url);
                }
            }
        }
        const newCoupon = new CouponModel_1.CouponModel({
            couponName: couponName.trim(),
            couponImage: uploadedImages,
            startDate: new Date(startDate),
            endDate: (new Date(new Date(endDate).setHours(23, 59, 59, 999))),
            description: description.trim(),
            minPurchase: Number(minPurchase),
            discountType,
            discountPercentage: discountType === 'Percentage' ? Number(discountPercentage) : undefined,
            discountValue: discountType === 'Amount' ? Number(discountValue) : undefined,
            status: status === true || status === 'true',
            userUsageLimit: userUsageLimit ? Number(userUsageLimit) : undefined
        });
        await newCoupon.save();
        res.status(201).json({ success: true, message: 'Coupon added successfully!', data: newCoupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error adding coupon' });
    }
};
exports.addCoupon = addCoupon;
const getAllCoupons = async (req, res) => {
    try {
        const coupons = await CouponModel_1.CouponModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching coupons' });
    }
};
exports.getAllCoupons = getAllCoupons;
const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel_1.CouponModel.findById(id);
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching coupon' });
    }
};
exports.getCouponById = getCouponById;
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { couponName, couponImage, startDate, endDate, description, minPurchase, discountType, discountPercentage, discountValue, status, userUsageLimit } = req.body;
        const coupon = await CouponModel_1.CouponModel.findById(id);
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        const existingCoupon = await CouponModel_1.CouponModel.findOne({
            _id: { $ne: id },
            couponName: { $regex: new RegExp(`^${couponName.trim()}$`, 'i') }
        });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Another coupon with this name already exists' });
        }
        coupon.couponName = couponName.trim();
        coupon.startDate = new Date(startDate);
        coupon.endDate = (new Date(new Date(endDate).setHours(23, 59, 59, 999)));
        coupon.description = description.trim();
        coupon.minPurchase = Number(minPurchase);
        coupon.discountType = discountType;
        coupon.discountPercentage = discountType === 'Percentage' ? Number(discountPercentage) : undefined;
        coupon.discountValue = discountType === 'Amount' ? Number(discountValue) : undefined;
        coupon.status = status === true || status === 'true';
        coupon.userUsageLimit = userUsageLimit ? Number(userUsageLimit) : undefined;
        if (couponImage && Array.isArray(couponImage)) {
            const updatedImages = [];
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary_1.default.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    updatedImages.push(uploadRes.secure_url);
                }
                else if (img.startsWith('http')) {
                    updatedImages.push(img);
                }
            }
            coupon.couponImage = updatedImages;
        }
        await coupon.save();
        res.status(200).json({ success: true, message: 'Coupon updated successfully!', data: coupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating coupon' });
    }
};
exports.updateCoupon = updateCoupon;
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel_1.CouponModel.findByIdAndDelete(id);
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, message: 'Coupon deleted successfully!' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting coupon' });
    }
};
exports.deleteCoupon = deleteCoupon;
const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel_1.CouponModel.findById(id);
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        coupon.status = !coupon.status;
        await coupon.save();
        res.status(200).json({ success: true, message: `Coupon ${coupon.status ? 'activated' : 'deactivated'} successfully`, data: coupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleCouponStatus = toggleCouponStatus;
