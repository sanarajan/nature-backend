import { Request, Response } from 'express';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';
import mongoose from 'mongoose';

export class AdminOfferController {
    private extractId(item: any): string | null {
        if (!item) return null;
        if (typeof item === 'string' && mongoose.isValidObjectId(item)) {
            return item;
        }
        if (mongoose.isValidObjectId(item) && item.toString) {
            return item.toString();
        }
        if (typeof item === 'object') {
            const inner = item.productId || item.product || item._id || item.id;
            if (inner) {
                if (typeof inner === 'object') {
                    return this.extractId(inner);
                }
                if (typeof inner === 'string' && mongoose.isValidObjectId(inner)) {
                    return inner;
                }
            }
        }
        return null;
    }

    public async createOffer(req: Request, res: Response): Promise<void> {
        try {
            const { offerName, offerFor, productId, categoryId, discountType, discountValue, startDate, endDate, status } = req.body;

            const cleanProductId = this.extractId(productId);
            const cleanCategoryId = this.extractId(categoryId);

            // Validation: discountValue must be less than product price (if offerFor is product)
            if (offerFor === 'product' && cleanProductId) {
                const product = await ProductModel.findById(cleanProductId);
                if (product) {
                    if (discountType === 'amount' && discountValue >= product.price) {
                        res.status(400).json({ success: false, message: 'Discount amount must be less than product price' });
                        return;
                    }
                    if (discountType === 'percentage' && discountValue >= 100) {
                        res.status(400).json({ success: false, message: 'Discount percentage must be less than 100%' });
                        return;
                    }
                }
            }

            const newOffer = new OfferModel({
                offerName,
                offerFor,
                productId: cleanProductId ? new mongoose.Types.ObjectId(cleanProductId) : undefined,
                categoryId: cleanCategoryId ? new mongoose.Types.ObjectId(cleanCategoryId) : undefined,
                discountType,
                discountValue,
                startDate,
                endDate,
                status: status !== undefined ? status : true
            });

            await newOffer.save();
            res.status(201).json({ success: true, message: 'Offer created successfully', data: newOffer });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async getOffers(req: Request, res: Response): Promise<void> {
        try {
            const offers = await OfferModel.find({ isDeleted: { $ne: true } })
                .populate('productId', 'productName price')
                .populate('categoryId', 'categoryName')
                .sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: offers });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async updateOffer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const cleanProductId = this.extractId(updateData.productId);
            const cleanCategoryId = this.extractId(updateData.categoryId);

            if (updateData.offerFor === 'product' && cleanProductId && updateData.discountValue) {
                const product = await ProductModel.findById(cleanProductId);
                if (product) {
                    if (updateData.discountType === 'amount' && updateData.discountValue >= product.price) {
                        res.status(400).json({ success: false, message: 'Discount amount must be less than product price' });
                        return;
                    }
                }
            }

            // Clean up IDs in updateData
            if (updateData.productId) updateData.productId = cleanProductId ? new mongoose.Types.ObjectId(cleanProductId) : undefined;
            if (updateData.categoryId) updateData.categoryId = cleanCategoryId ? new mongoose.Types.ObjectId(cleanCategoryId) : undefined;

            const updatedOffer = await OfferModel.findOneAndUpdate(
                { _id: id, isDeleted: { $ne: true } },
                updateData,
                { new: true }
            );
            if (!updatedOffer) {
                res.status(404).json({ success: false, message: 'Offer not found' });
                return;
            }

            res.status(200).json({ success: true, message: 'Offer updated successfully', data: updatedOffer });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async deleteOffer(req: Request, res: Response): Promise<void> {
        try {
            console.log('--- SOFT DELETE /api/admin/offers/:id Controller Hit ---');
            const { id } = req.params;
            const offer = await OfferModel.findById(id);
            if (!offer) {
                res.status(404).json({ success: false, message: 'Offer not found' });
                return;
            }
            offer.isDeleted = true;
            await offer.save();
            console.log(`[SUCCESS] Offer ${id} marked as isDeleted: true`);
            res.status(200).json({ success: true, message: 'Offer deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async toggleStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const offer = await OfferModel.findById(id);
            if (!offer) {
                res.status(404).json({ success: false, message: 'Offer not found' });
                return;
            }
            offer.status = !offer.status;
            await offer.save();
            res.status(200).json({ success: true, message: `Offer ${offer.status ? 'activated' : 'deactivated'} successfully`, data: offer });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }
}
