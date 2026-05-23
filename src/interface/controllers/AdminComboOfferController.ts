import { Request, Response } from 'express';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';
import mongoose from 'mongoose';
import cloudinary from '../../infrastructure/config/cloudinary';

export class AdminComboOfferController {
    /**
     * Ultra-Robust ID Extraction:
     * This method is designed to find a valid 24-char hex string (ObjectId)
     * no matter how many layers of objects it is wrapped in.
     */
    private extractId(item: any): string | null {
        if (!item) return null;
        
        // 1. If it is already a valid ObjectId hex string
        if (typeof item === 'string' && mongoose.isValidObjectId(item)) {
            return item;
        }

        // 2. If it is a Mongoose ObjectId instance
        if (mongoose.isValidObjectId(item) && item.toString) {
            return item.toString();
        }

        // 3. If it is an object, dig deep
        if (typeof item === 'object') {
            // Check common fields that might hold the ID or another object containing the ID
            const inner = item.productId || item.product || item._id || item.id;
            
            if (inner) {
                // If the inner value is an object, recurse to find the string
                if (typeof inner === 'object') {
                    return this.extractId(inner);
                }
                // If it's a string, validate it
                if (typeof inner === 'string' && mongoose.isValidObjectId(inner)) {
                    return inner;
                }
            }
        }

        return null;
    }

    public async createComboOffer(req: Request, res: Response): Promise<void> {
        try {console.log("reached in combo");
            const { offerName, products, discountType, discountValue, maxUsagePerOrder, startDate, endDate, status, image } = req.body;

            console.log('[CreateComboOffer] Image included?:', !!image, 'Type:', typeof image, 'Starts with data:?', image?.startsWith?.('data:image'));

            if (!products || !Array.isArray(products) || products.length < 1) {
                res.status(400).json({ success: false, message: 'Combo must include at least 1 product' });
                return;
            }

            // 1. Clean and Collapse the incoming product list
            const collapsedMap = new Map<string, number>();
            products.forEach(p => {
                const id = this.extractId(p);
                const qty = Number(p.requiredQuantity || p.quantity) || 1;
                if (id) {
                    collapsedMap.set(id, (collapsedMap.get(id) || 0) + qty);
                }
            });

            const cleanedItems: {id: string, requiredQuantity: number}[] = [];
            collapsedMap.forEach((qty, id) => {
                cleanedItems.push({ id, requiredQuantity: qty });
            });

            if (cleanedItems.length === 0) {
                res.status(400).json({ success: false, message: 'No valid products identified in the request' });
                return;
            }

            // Validation: Must have > 1 product OR at least one product with quantity > 1
            const isValidCombo = cleanedItems.length > 1 || cleanedItems.some(p => p.requiredQuantity > 1);
            if (!isValidCombo) {
                res.status(400).json({ success: false, message: 'Combo must contain multiple products or at least one product with quantity greater than 1' });
                return;
            }

            // 2. Fetch and Validate sum
            const productIds = cleanedItems.map(i => i.id as string);
            const finalQueryIds = productIds.filter(id => mongoose.isValidObjectId(id));
            const productDocs = await ProductModel.find({ _id: { $in: finalQueryIds } });
            
            let totalSum = 0;
            cleanedItems.forEach(item => {
                const doc = productDocs.find(d => d._id.toString() === item.id);
                if (doc) {
                    totalSum += (doc.price || 0) * item.requiredQuantity;
                }
            });

            // 3. Discount Validation
            if (discountType === 'amount' && Number(discountValue) >= totalSum) {
                res.status(400).json({ success: false, message: `Discount amount (₹${discountValue}) must be less than total sum (₹${totalSum})` });
                return;
            } else if (discountType === 'percentage' && Number(discountValue) >= 100) {
                res.status(400).json({ success: false, message: 'Discount percentage must be less than 100%' });
                return;
            }

            // 4. Handle Image Upload
            let finalImageUrl: string | undefined = undefined;
            // Access req.body directly to avoid any destructuring issues
            const b64Data = req.body.image || req.body.imageUrl;
            
            console.log('[CreateComboOffer] RAW Image detection - Body keys:', Object.keys(req.body));
            console.log('[CreateComboOffer] b64Data present?:', !!b64Data, 'Type:', typeof b64Data);

            if (b64Data && typeof b64Data === 'string' && b64Data.startsWith('data:image')) {
                console.log('[CreateComboOffer] Uploading to Cloudinary...');
                try {
                    const uploadRes = await cloudinary.uploader.upload(b64Data, {
                        folder: 'natural_ayam/combo_offers',
                    });
                    finalImageUrl = uploadRes.secure_url;

                    console.log('[CreateComboOffer] SUCCESS! Cloudinary URL:', finalImageUrl);
                } catch (uploadErr) {
                    console.error('[CreateComboOffer] CLOUDINARY ERROR:', uploadErr);
                    throw new Error('Image upload to Cloudinary failed');
                }
            }

            // 5. Create Model
            const newComboOffer = new ComboOfferModel({
                offerName,
                products: cleanedItems.map(item => ({
                    productId: new mongoose.Types.ObjectId(item.id!),
                    requiredQuantity: item.requiredQuantity
                })),
                discountType: discountType || 'amount',
                discountValue,
                maxUsagePerOrder: maxUsagePerOrder || 0,
                startDate,
                endDate,
                status: status !== undefined ? status : true
            });
            
            // Define imageUrl explicitly on the instance
            if (finalImageUrl) {
                newComboOffer.imageUrl = finalImageUrl;
            }

            await newComboOffer.save();
            res.status(201).json({ success: true, message: 'Combo Offer created successfully', data: newComboOffer });
        } catch (error: any) {
            console.error('[CreateComboOffer] CRITICAL ERROR:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async getComboOffers(req: Request, res: Response): Promise<void> {
        try {
            const offers = await ComboOfferModel.find({ isDeleted: { $ne: true } })
                .populate('products.productId', 'productName price')
                .sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: offers });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async updateComboOffer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            console.log('[UpdateComboOffer] BEGIN - ID:', id, 'Keys:', Object.keys(updateData));

            const existing = await ComboOfferModel.findById(id);
            if (!existing) {
                res.status(404).json({ success: false, message: 'Combo Offer not found' });
                return;
            }

            // Clean products if they are being updated
            let cleanedItems: {id: string, requiredQuantity: number}[] = [];
            if (updateData.products) {
                const collapsedMap = new Map<string, number>();
                updateData.products.forEach((p: any) => {
                    const pid = this.extractId(p);
                    const qty = Number(p.requiredQuantity || p.quantity) || 1;
                    if (pid) {
                        collapsedMap.set(pid, (collapsedMap.get(pid) || 0) + qty);
                    }
                });
                collapsedMap.forEach((qty, pid) => {
                    cleanedItems.push({ id: pid, requiredQuantity: qty });
                });
            }

            // Handle Image Update
            const b64Update = updateData.image || updateData.imageUrl;
            console.log('[UpdateComboOffer] RAW Image detection - Body keys:', Object.keys(updateData));
            console.log('[UpdateComboOffer] b64Update present?:', !!b64Update);

            if (b64Update && typeof b64Update === 'string') {
                if (b64Update.startsWith('data:image')) {
                    console.log('[UpdateComboOffer] New base64 image detected. Uploading...');
                    const uploadRes = await cloudinary.uploader.upload(b64Update, {
                        folder: 'natural_ayam/combo_offers',
                    });
                    existing.imageUrl = uploadRes.secure_url;
                    console.log('[UpdateComboOffer] SUCCESS! Cloudinary URL:', existing.imageUrl);
                } else if (b64Update.startsWith('http')) {
                    console.log('[UpdateComboOffer] Existing URL provided. Retaining:', b64Update);
                    existing.imageUrl = b64Update;
                }
            } else if (b64Update === '') {
                console.log('[UpdateComboOffer] Image explicitly cleared by user');
                existing.imageUrl = undefined;
            }

            // Update standard fields
            if (updateData.offerName) existing.offerName = updateData.offerName;
            if (updateData.discountType) existing.discountType = updateData.discountType;
            if (updateData.discountValue !== undefined) existing.discountValue = Number(updateData.discountValue);
            if (updateData.startDate) existing.startDate = new Date(updateData.startDate);
            if (updateData.endDate) existing.endDate = new Date(updateData.endDate);
            if (updateData.maxUsagePerOrder !== undefined) existing.maxUsagePerOrder = Number(updateData.maxUsagePerOrder);
            if (updateData.status !== undefined) existing.status = updateData.status;

            if (updateData.products && cleanedItems.length > 0) {
                existing.products = cleanedItems.map(item => ({
                    productId: new mongoose.Types.ObjectId(item.id!),
                    requiredQuantity: item.requiredQuantity
                })) as any;
            }

            const updatedOffer = await existing.save();
            res.status(200).json({ success: true, message: 'Combo Offer updated successfully', data: updatedOffer });
        } catch (error: any) {
            console.error('[UpdateComboOffer] ERROR:', error);
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async deleteComboOffer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const offer = await ComboOfferModel.findById(id);
            if (!offer) {
                res.status(404).json({ success: false, message: 'Combo Offer not found' });
                return;
            }
            offer.isDeleted = true;
            await offer.save();
            res.status(200).json({ success: true, message: 'Combo Offer deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }

    public async toggleStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const offer = await ComboOfferModel.findById(id);
            if (!offer) {
                res.status(404).json({ success: false, message: 'Combo Offer not found' });
                return;
            }
            offer.status = !offer.status;
            await offer.save();
            res.status(200).json({ success: true, message: `Combo Offer status toggled`, data: offer });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Server Error' });
        }
    }
}
