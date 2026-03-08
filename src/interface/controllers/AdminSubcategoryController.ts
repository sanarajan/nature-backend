import { Request, Response } from 'express';
import { SubCategoryModel } from '../../infrastructure/database/models/SubCategoryModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';

export const addSubcategory = async (req: Request, res: Response) => {
    try {
        const { subcategoryName, categoryId, description, isActive } = req.body;

        if (!subcategoryName) {
            return res.status(400).json({ success: false, message: 'Subcategory name is required' });
        }
        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'Parent Category is required' });
        }

        // Check for uniqueness
        const existingSubcategory = await SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${subcategoryName}$`, 'i') },
            categoryId // Unique per category
        });
        if (existingSubcategory) {
            return res.status(400).json({ success: false, message: 'Subcategory name already exists in this category' });
        }

        const newSubcategory = new SubCategoryModel({
            subcategoryName,
            categoryId,
            description,
            isActive: isActive !== undefined ? isActive : true
        });

        await newSubcategory.save();
        res.status(201).json({ success: true, message: 'Subcategory created successfully', data: newSubcategory });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error adding subcategory' });
    }
};

export const getAllSubcategories = async (req: Request, res: Response) => {
    try {
        const subcategories = await SubCategoryModel.find()
            .populate({ path: 'categoryId', model: 'Category', select: 'categoryName' })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: subcategories });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching subcategories' });
    }
};

export const updateSubcategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { subcategoryName, categoryId, description, isActive } = req.body;

        if (!subcategoryName) {
            return res.status(400).json({ success: false, message: 'Subcategory name is required' });
        }

        // Check for uniqueness excluding current
        const existingSubcategory = await SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${subcategoryName}$`, 'i') },
            categoryId,
            _id: { $ne: id }
        });

        if (existingSubcategory) {
            return res.status(400).json({ success: false, message: 'Subcategory name already exists in this category' });
        }

        const updatedSubcategory = await SubCategoryModel.findByIdAndUpdate(
            id,
            { subcategoryName, categoryId, description, isActive },
            { new: true, runValidators: true }
        );

        if (!updatedSubcategory) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        res.status(200).json({ success: true, message: 'Subcategory updated successfully', data: updatedSubcategory });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating subcategory' });
    }
};

export const deleteSubcategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if any products use this subcategory
        const productsCount = await ProductModel.countDocuments({ subcategoryId: id });
        if (productsCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete subcategory because it is already associated with one or more products.' });
        }

        const deletedSubcategory = await SubCategoryModel.findByIdAndDelete(id);

        if (!deletedSubcategory) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        res.status(200).json({ success: true, message: 'Subcategory deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting subcategory' });
    }
};
