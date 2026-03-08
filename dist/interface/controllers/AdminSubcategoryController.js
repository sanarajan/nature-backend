"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubcategory = exports.updateSubcategory = exports.getAllSubcategories = exports.addSubcategory = void 0;
const SubCategoryModel_1 = require("../../infrastructure/database/models/SubCategoryModel");
const ProductModel_1 = require("../../infrastructure/database/models/ProductModel");
const addSubcategory = async (req, res) => {
    try {
        const { subcategoryName, categoryId, description, isActive } = req.body;
        if (!subcategoryName) {
            return res.status(400).json({ success: false, message: 'Subcategory name is required' });
        }
        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'Parent Category is required' });
        }
        // Check for uniqueness
        const existingSubcategory = await SubCategoryModel_1.SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${subcategoryName}$`, 'i') },
            categoryId // Unique per category
        });
        if (existingSubcategory) {
            return res.status(400).json({ success: false, message: 'Subcategory name already exists in this category' });
        }
        const newSubcategory = new SubCategoryModel_1.SubCategoryModel({
            subcategoryName,
            categoryId,
            description,
            isActive: isActive !== undefined ? isActive : true
        });
        await newSubcategory.save();
        res.status(201).json({ success: true, message: 'Subcategory created successfully', data: newSubcategory });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error adding subcategory' });
    }
};
exports.addSubcategory = addSubcategory;
const getAllSubcategories = async (req, res) => {
    try {
        const subcategories = await SubCategoryModel_1.SubCategoryModel.find()
            .populate({ path: 'categoryId', model: 'Category', select: 'categoryName' })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: subcategories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching subcategories' });
    }
};
exports.getAllSubcategories = getAllSubcategories;
const updateSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { subcategoryName, categoryId, description, isActive } = req.body;
        if (!subcategoryName) {
            return res.status(400).json({ success: false, message: 'Subcategory name is required' });
        }
        // Check for uniqueness excluding current
        const existingSubcategory = await SubCategoryModel_1.SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${subcategoryName}$`, 'i') },
            categoryId,
            _id: { $ne: id }
        });
        if (existingSubcategory) {
            return res.status(400).json({ success: false, message: 'Subcategory name already exists in this category' });
        }
        const updatedSubcategory = await SubCategoryModel_1.SubCategoryModel.findByIdAndUpdate(id, { subcategoryName, categoryId, description, isActive }, { new: true, runValidators: true });
        if (!updatedSubcategory) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }
        res.status(200).json({ success: true, message: 'Subcategory updated successfully', data: updatedSubcategory });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating subcategory' });
    }
};
exports.updateSubcategory = updateSubcategory;
const deleteSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if any products use this subcategory
        const productsCount = await ProductModel_1.ProductModel.countDocuments({ subcategoryId: id });
        if (productsCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete subcategory because it is already associated with one or more products.' });
        }
        const deletedSubcategory = await SubCategoryModel_1.SubCategoryModel.findByIdAndDelete(id);
        if (!deletedSubcategory) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }
        res.status(200).json({ success: true, message: 'Subcategory deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting subcategory' });
    }
};
exports.deleteSubcategory = deleteSubcategory;
