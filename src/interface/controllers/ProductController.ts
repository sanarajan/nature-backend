import { Request, Response } from 'express';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';

const applyOffers = async (products: any[]) => {
    const now = new Date();
    const activeOffers = await OfferModel.find({
        status: true,
        isDeleted: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    return products.map(product => {
        const productObj = product.toObject ? product.toObject() : product;
        
        let bestDiscount = 0;
        let appliedOffer = null;

        activeOffers.forEach(offer => {
            let isApplicable = false;
            const prodCatId = productObj.categoryId?._id ? productObj.categoryId._id.toString() : productObj.categoryId?.toString();

            if (offer.offerFor === 'product' && offer.productId?.toString() === productObj._id.toString()) {
                isApplicable = true;
            } else if (offer.offerFor === 'category' && offer.categoryId?.toString() === prodCatId) {
                isApplicable = true;
            }

            if (isApplicable) {
                let currentDiscount = 0;
                if (offer.discountType === 'percentage') {
                    currentDiscount = (productObj.price * offer.discountValue) / 100;
                } else {
                    currentDiscount = offer.discountValue;
                }

                if (currentDiscount > bestDiscount) {
                    bestDiscount = currentDiscount;
                    appliedOffer = offer;
                }
            }
        });

        if (bestDiscount > 0) {
            productObj.offerPrice = Math.max(0, productObj.price - bestDiscount);
            productObj.appliedOffer = appliedOffer;
        }

        return productObj;
    });
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
    try {
        let products = await ProductModel.find({
            isActive: true,
            $or: [
                { featured: true },
                { isPopular: true },
                { isTrending: true },
                { isBestSeller: true }
            ]
        })
            .limit(8)
            .sort({ createdAt: -1 });

        if (products.length < 8) {
            const excludedIds = products.map(p => p._id);
            const remainingCount = 8 - products.length;

            const extraProducts = await ProductModel.find({
                isActive: true,
                _id: { $nin: excludedIds }
            })
                .limit(remainingCount)
                .sort({ createdAt: -1 });

            products = [...products, ...extraProducts];
        }

        const productsWithOffers = await applyOffers(products);

        res.status(200).json({
            success: true,
            data: productsWithOffers
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching featured products'
        });
    }
};

export const getFilteredProducts = async (req: Request, res: Response) => {
    try {
        const { categoryId, subcategoryId, search, minPrice, maxPrice, sort, onOffer } = req.query;

        const query: any = { isActive: true };

        if (categoryId) {
            const catIds = typeof categoryId === 'string' ? categoryId.split(',') : (Array.isArray(categoryId) ? categoryId : [categoryId]);
            query.categoryId = { $in: catIds };
        }
        if (subcategoryId) {
            const subIds = typeof subcategoryId === 'string' ? subcategoryId.split(',') : (Array.isArray(subcategoryId) ? subcategoryId : [subcategoryId]);
            query.subcategoryId = { $in: subIds };
        }
        if (search) {
            query.productName = { $regex: search, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOption: any = { createdAt: -1 };
        if (sort === 'price-low-high') sortOption = { price: 1 };
        if (sort === 'price-high-low') sortOption = { price: -1 };
        if (sort === 'newest') sortOption = { createdAt: -1 };

        const products = await ProductModel.find(query)
            .populate('categoryId', 'categoryName')
            .populate('subcategoryId', 'subcategoryName')
            .sort(sortOption);

        const productsWithOffers = await applyOffers(products);

        let finalProducts = productsWithOffers;
        if (onOffer === 'true') {
            finalProducts = productsWithOffers.filter(p => !!p.appliedOffer);
        }

        res.status(200).json({
            success: true,
            data: finalProducts
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching filtered products'
        });
    }
};

export const getPopularProducts = async (req: Request, res: Response) => {
    try {
        const products = await ProductModel.find({ isPopular: true, isActive: true })
            .limit(8)
            .sort({ createdAt: -1 });

        const productsWithOffers = await applyOffers(products);

        res.status(200).json({
            success: true,
            data: productsWithOffers
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching popular products'
        });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findById(id)
            .populate('categoryId', 'categoryName')
            .populate('subcategoryId', 'subcategoryName');

        if (!product || !product.isActive) {
            res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
            return;
        }

        const productWithOffer = (await applyOffers([product]))[0];

        res.status(200).json({
            success: true,
            data: productWithOffer
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching product details'
        });
    }
};

export const getComboOffers = async (req: Request, res: Response) => {
    try {
        const { categoryIds, discountTypes, sort } = req.query;
        const now = new Date();
        const filter: any = {
            status: true,
            isDeleted: { $ne: true },
            startDate: { $lte: now },
            endDate: { $gte: now }
        };

        if (discountTypes) {
            const types = Array.isArray(discountTypes) ? discountTypes : [discountTypes];
            if (types.length > 0) {
                filter.discountType = { $in: types };
            }
        }

        const combos = await ComboOfferModel.find(filter)
            .populate({
                path: 'products.productId',
                populate: { path: 'categoryId', select: 'categoryName' }
            })
            .sort({ createdAt: -1 });

        let combosWithCalculations = combos.map(combo => {
            const comboObj: any = combo.toObject();
            let totalMRP = 0;
            const uniqueCategories = new Set<string>();

            const products = comboObj.products.map((p: any) => {
                const prodPrice = p.productId?.price || 0;
                const qty = p.requiredQuantity || p.quantity || 1;
                totalMRP += prodPrice * qty;
                if (p.productId?.categoryId) {
                    uniqueCategories.add(p.productId.categoryId._id.toString());
                }
                return { ...p, quantity: qty };
            });

            let savings = 0;
            if (comboObj.discountType === 'percentage') {
                savings = (totalMRP * comboObj.discountValue) / 100;
            } else if (comboObj.discountType === 'amount') {
                savings = comboObj.discountValue;
            }

            return {
                ...comboObj,
                products,
                totalMRP: Math.round(totalMRP),
                comboPrice: Math.round(Math.max(0, totalMRP - savings)),
                savings: Math.round(savings),
                savingsPercent: totalMRP > 0 ? Math.round((savings / totalMRP) * 100) : 0,
                categoryIds: Array.from(uniqueCategories)
            };
        });

        if (categoryIds) {
            const selectedCats = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
            if (selectedCats.length > 0) {
                combosWithCalculations = combosWithCalculations.filter(c => 
                    selectedCats.some((id: any) => c.categoryIds.includes(id))
                );
            }
        }

        if (sort === 'best-savings') {
            combosWithCalculations.sort((a: any, b: any) => b.savings - a.savings);
        } else if (sort === 'price-low-high') {
            combosWithCalculations.sort((a: any, b: any) => a.comboPrice - b.comboPrice);
        } else if (sort === 'price-high-low') {
            combosWithCalculations.sort((a: any, b: any) => b.comboPrice - a.comboPrice);
        }

        res.status(200).json({
            success: true,
            data: combosWithCalculations
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching combo offers'
        });
    }
};

export const getOfferProducts = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const activeOffers = await OfferModel.find({
            status: true,
            isDeleted: { $ne: true },
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        const activeProductIds = activeOffers.filter(o => o.offerFor === 'product').map(o => o.productId?.toString());
        const activeCategoryIds = activeOffers.filter(o => o.offerFor === 'category').map(o => o.categoryId?.toString());

        const products = await ProductModel.find({
            isActive: true,
            $or: [
                { _id: { $in: activeProductIds } },
                { categoryId: { $in: activeCategoryIds } }
            ]
        }).limit(4).sort({ createdAt: -1 });

        const productsWithOffers = await applyOffers(products);

        // Calculate max percentage and fixed amount
        let maxPercent = 0;
        let maxAmount = 0;

        activeOffers.forEach(offer => {
            if (offer.discountType === 'percentage') {
                if (offer.discountValue > maxPercent) maxPercent = offer.discountValue;
            } else {
                if (offer.discountValue > maxAmount) maxAmount = offer.discountValue;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                products: productsWithOffers,
                maxPercent,
                maxAmount
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching offer products'
        });
    }
};
