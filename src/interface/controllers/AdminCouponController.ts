import { Request, Response } from 'express';
import { CouponModel } from '../../infrastructure/database/models/CouponModel';
import cloudinary from '../../infrastructure/config/cloudinary';

export const addCoupon = async (req: Request, res: Response) => {
    try {
        const {
            couponName, couponImage, startDate, endDate, description,
            minPurchase, discountType, discountPercentage, discountValue,
            status, userUsageLimit
        } = req.body;

        if (!couponName || !startDate || !endDate || !description || !minPurchase || !discountType) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existingCoupon = await CouponModel.findOne({
            couponName: { $regex: new RegExp(`^${couponName.trim()}$`, 'i') }
        });

        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon with this name already exists' });
        }

        const uploadedImages: string[] = [];
        if (couponImage && Array.isArray(couponImage)) {
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    uploadedImages.push(uploadRes.secure_url);
                }
            }
        }

        const newCoupon = new CouponModel({
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error adding coupon' });
    }
};

export const getAllCoupons = async (req: Request, res: Response) => {
    try {
        const coupons = await CouponModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching coupons' });
    }
};

export const getCouponById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching coupon' });
    }
};

export const updateCoupon = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            couponName, couponImage, startDate, endDate, description,
            minPurchase, discountType, discountPercentage, discountValue,
            status, userUsageLimit
        } = req.body;

        const coupon = await CouponModel.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        const existingCoupon = await CouponModel.findOne({
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
            const updatedImages: string[] = [];
            for (const img of couponImage) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary.uploader.upload(img, {
                        folder: 'natural_ayam/coupons',
                    });
                    updatedImages.push(uploadRes.secure_url);
                } else if (img.startsWith('http')) {
                    updatedImages.push(img);
                }
            }
            coupon.couponImage = updatedImages;
        }

        await coupon.save();
        res.status(200).json({ success: true, message: 'Coupon updated successfully!', data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating coupon' });
    }
};

export const deleteCoupon = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel.findByIdAndDelete(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, message: 'Coupon deleted successfully!' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting coupon' });
    }
};

export const toggleCouponStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        coupon.status = !coupon.status;
        await coupon.save();
        res.status(200).json({ success: true, message: `Coupon ${coupon.status ? 'activated' : 'deactivated'} successfully`, data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
