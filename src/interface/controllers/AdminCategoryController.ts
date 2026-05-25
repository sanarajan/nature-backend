import { Request, Response } from 'express';
import { CategoryModel } from '../../infrastructure/database/models/CategoryModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';
import cloudinary from '../../infrastructure/config/cloudinary';

export const addCategory = async (req: Request, res: Response) => {
    try {
        const { categoryName, description, isActive, imageUrl } = req.body;

        if (!categoryName) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        // Check for uniqueness
        const existingCategory = await CategoryModel.findOne({ categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already exists constraints' });
        }

        let uploadedImageUrl = imageUrl;
        if (imageUrl && imageUrl.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(imageUrl, {
                folder: 'natural_ayam/categories',
            });
            uploadedImageUrl = uploadRes.secure_url;
        }

        const newCategory = new CategoryModel({
            categoryName,
            description,
            imageUrl: uploadedImageUrl,
            isActive: isActive !== undefined ? isActive : true
        });

        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error adding category' });
    }
};

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await CategoryModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching categories' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { categoryName, description, isActive, imageUrl } = req.body;

        if (!categoryName) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        // Check for uniqueness excluding current category
        const existingCategory = await CategoryModel.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already exists constraints' });
        }

        let uploadedImageUrl = imageUrl;
        if (imageUrl && imageUrl.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(imageUrl, {
                folder: 'natural_ayam/categories',
            });
            uploadedImageUrl = uploadRes.secure_url;
        }

        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            id,
            { categoryName, description, imageUrl: uploadedImageUrl, isActive },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully', data: updatedCategory });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating category' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if any products use this category
        const productsCount = await ProductModel.countDocuments({ categoryId: id });
        if (productsCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete category because it is already associated with one or more products.' });
        }

        const deletedCategory = await CategoryModel.findByIdAndDelete(id);

        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting category' });
    }
};
