import { Request, Response } from 'express';
import { CategoryModel } from '../../infrastructure/database/models/CategoryModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';
import mongoose from 'mongoose';

export const getCategoriesWithCounts = async (req: Request, res: Response) => {
    try {
        // Fetch all active categories
        const categories = await CategoryModel.find({ isActive: true }).sort({ categoryName: 1 });

        // Get product counts per category
        const counts = await ProductModel.aggregate([
            { $group: { _id: "$categoryId", count: { $sum: 1 } } }
        ]);

        // Map counts for easy lookup
        const countMap: Record<string, number> = {};
        counts.forEach(item => {
            if (item._id) {
                countMap[item._id.toString()] = item.count;
            }
        });

        // Merge counts into categories
        const data = categories.map(cat => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            description: cat.description,
            productCount: countMap[cat._id.toString()] || 0
        }));

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching categories with counts' });
    }
};

export const getCategoryHierarchy = async (req: Request, res: Response) => {
    try {
        const categories = await CategoryModel.find({ isActive: true }).sort({ categoryName: 1 });
        const subcategories = await mongoose.model('SubCategory').find({ isActive: true }).sort({ subcategoryName: 1 });

        const hierarchy = categories.map(cat => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            subcategories: subcategories
                .filter(sub => (sub as any).categoryId.toString() === cat._id.toString())
                .map(sub => ({
                    _id: sub._id,
                    subcategoryName: (sub as any).subcategoryName
                }))
        }));

        res.status(200).json({ success: true, data: hierarchy });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching category hierarchy' });
    }
};
