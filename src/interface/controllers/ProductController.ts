import { Request, Response } from 'express';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';

export const getFeaturedProducts = async (req: Request, res: Response) => {
    try {
        // 1. Fetch products with any highlight flag
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

        // 2. If less than 8, backfill with regular active products
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

        res.status(200).json({
            success: true,
            data: products
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
        const { categoryId, subcategoryId, search, minPrice, maxPrice, sort } = req.query;

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

        res.status(200).json({
            success: true,
            data: products
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

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching popular products'
        });
    }
};
