"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryHierarchy = exports.getCategoriesWithCounts = void 0;
const CategoryModel_1 = require("../../infrastructure/database/models/CategoryModel");
const ProductModel_1 = require("../../infrastructure/database/models/ProductModel");
const mongoose_1 = __importDefault(require("mongoose"));
const getCategoriesWithCounts = async (req, res) => {
    try {
        // Fetch all active categories
        const categories = await CategoryModel_1.CategoryModel.find({ isActive: true }).sort({ categoryName: 1 });
        // Get product counts per category
        const counts = await ProductModel_1.ProductModel.aggregate([
            { $group: { _id: "$categoryId", count: { $sum: 1 } } }
        ]);
        // Map counts for easy lookup
        const countMap = {};
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching categories with counts' });
    }
};
exports.getCategoriesWithCounts = getCategoriesWithCounts;
const getCategoryHierarchy = async (req, res) => {
    try {
        const categories = await CategoryModel_1.CategoryModel.find({ isActive: true }).sort({ categoryName: 1 });
        const subcategories = await mongoose_1.default.model('SubCategory').find({ isActive: true }).sort({ subcategoryName: 1 });
        const hierarchy = categories.map(cat => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            subcategories: subcategories
                .filter(sub => sub.categoryId.toString() === cat._id.toString())
                .map(sub => ({
                _id: sub._id,
                subcategoryName: sub.subcategoryName
            }))
        }));
        res.status(200).json({ success: true, data: hierarchy });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching category hierarchy' });
    }
};
exports.getCategoryHierarchy = getCategoryHierarchy;
