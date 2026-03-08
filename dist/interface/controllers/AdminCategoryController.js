"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getAllCategories = exports.addCategory = void 0;
const CategoryModel_1 = require("../../infrastructure/database/models/CategoryModel");
const ProductModel_1 = require("../../infrastructure/database/models/ProductModel");
const addCategory = async (req, res) => {
    try {
        const { categoryName, description, isActive } = req.body;
        if (!categoryName) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        // Check for uniqueness
        const existingCategory = await CategoryModel_1.CategoryModel.findOne({ categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already exists constraints' });
        }
        const newCategory = new CategoryModel_1.CategoryModel({
            categoryName,
            description,
            isActive: isActive !== undefined ? isActive : true
        });
        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error adding category' });
    }
};
exports.addCategory = addCategory;
const getAllCategories = async (req, res) => {
    try {
        const categories = await CategoryModel_1.CategoryModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching categories' });
    }
};
exports.getAllCategories = getAllCategories;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, description, isActive } = req.body;
        if (!categoryName) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        // Check for uniqueness excluding current category
        const existingCategory = await CategoryModel_1.CategoryModel.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') },
            _id: { $ne: id }
        });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already exists constraints' });
        }
        const updatedCategory = await CategoryModel_1.CategoryModel.findByIdAndUpdate(id, { categoryName, description, isActive }, { new: true, runValidators: true });
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category updated successfully', data: updatedCategory });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating category' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if any products use this category
        const productsCount = await ProductModel_1.ProductModel.countDocuments({ categoryId: id });
        if (productsCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete category because it is already associated with one or more products.' });
        }
        const deletedCategory = await CategoryModel_1.CategoryModel.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting category' });
    }
};
exports.deleteCategory = deleteCategory;
