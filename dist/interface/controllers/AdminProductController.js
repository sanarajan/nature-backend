"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleProductHighlight = exports.getProductById = exports.deleteProduct = exports.updateProduct = exports.getAllProducts = exports.addProduct = exports.getProductOptions = void 0;
const ProductModel_1 = require("../../infrastructure/database/models/ProductModel");
const CategoryModel_1 = require("../../infrastructure/database/models/CategoryModel");
const UnitModel_1 = require("../../infrastructure/database/models/UnitModel");
const SubCategoryModel_1 = require("../../infrastructure/database/models/SubCategoryModel");
const cloudinary_1 = __importDefault(require("../../infrastructure/config/cloudinary"));
const getProductOptions = async (req, res) => {
    try {
        const categories = await CategoryModel_1.CategoryModel.find({ isActive: true }).select('categoryName _id');
        const subcategories = await SubCategoryModel_1.SubCategoryModel.find({ isActive: true }).select('subcategoryName categoryId _id');
        const units = await UnitModel_1.UnitModel.find().select('unitName _id');
        res.status(200).json({ success: true, data: { categories, subcategories, units } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching options' });
    }
};
exports.getProductOptions = getProductOptions;
const addProduct = async (req, res) => {
    try {
        const { productName, categoryId, subcategoryId, unitId, quantity, stock, price, description, specifications, images, featured, isPopular, isTrending, isBestSeller } = req.body;
        if (!productName || !categoryId || !unitId || quantity === undefined || stock === undefined || price === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (images && images.length > 4) {
            return res.status(400).json({ success: false, message: 'Maximum 4 images allowed' });
        }
        const existingProduct = await ProductModel_1.ProductModel.findOne({
            productName: { $regex: new RegExp(`^${productName.trim()}$`, 'i') },
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity)
        });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'A product with this exact Name, Category, Subcategory, Unit, and Quantity already exists!'
            });
        }
        // Generate unique SKU
        const words = productName.trim().split(' ').filter((w) => w.length > 0);
        let prefix = words.length >= 3
            ? words.slice(0, 3).map((w) => w[0].toUpperCase()).join('')
            : words.map((w) => w[0].toUpperCase()).join('').padEnd(3, 'X');
        prefix = prefix.replace(/[^A-Z]/g, 'X').slice(0, 3);
        const lastProduct = await ProductModel_1.ProductModel.findOne({
            sku: { $regex: new RegExp(`^${prefix}-`, 'i') }
        }).sort({ sku: -1 }).select('sku');
        let sequence = 1;
        if (lastProduct && lastProduct.sku) {
            const parts = lastProduct.sku.split('-');
            if (parts.length > 1) {
                const lastSeq = parseInt(parts[1], 10);
                if (!isNaN(lastSeq)) {
                    sequence = lastSeq + 1;
                }
            }
        }
        const sku = `${prefix}-${sequence.toString().padStart(3, '0')}`;
        const uploadedImages = [];
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary_1.default.uploader.upload(img, {
                        folder: 'natural_ayam/products',
                    });
                    uploadedImages.push(uploadRes.secure_url);
                }
            }
        }
        const newProduct = new ProductModel_1.ProductModel({
            productName: productName.trim(),
            sku,
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity),
            stock: Number(stock),
            price: Number(price),
            description: description?.trim(),
            specifications: specifications || {},
            images: uploadedImages,
            featured: featured === true || featured === 'true',
            isPopular: isPopular === true || isPopular === 'true',
            isTrending: isTrending === true || isTrending === 'true',
            isBestSeller: isBestSeller === true || isBestSeller === 'true',
            isActive: true
        });
        await newProduct.save();
        res.status(201).json({ success: true, message: 'Product added successfully!', data: newProduct });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Product already exists with this name and specification.' });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error adding product' });
    }
};
exports.addProduct = addProduct;
const getAllProducts = async (req, res) => {
    try {
        const products = await ProductModel_1.ProductModel.find()
            .populate({ path: 'categoryId', model: 'Category', select: 'categoryName' })
            .populate({ path: 'subcategoryId', model: 'SubCategory', select: 'subcategoryName' })
            .populate({ path: 'unitId', model: 'Unit', select: 'unitName' })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: products });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: `Server error fetching products: ${error.message}` });
    }
};
exports.getAllProducts = getAllProducts;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { productName, categoryId, subcategoryId, unitId, quantity, stock, price, description, specifications, images, featured, isPopular, isTrending, isBestSeller } = req.body;
        if (!productName || !categoryId || !unitId || quantity === undefined || stock === undefined || price === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const product = await ProductModel_1.ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const existingProduct = await ProductModel_1.ProductModel.findOne({
            _id: { $ne: id },
            productName: { $regex: new RegExp(`^${productName.trim()}$`, 'i') },
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity)
        });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Another product with this exact Name, Category, Subcategory, Unit, and Quantity already exists!'
            });
        }
        product.productName = productName.trim();
        product.categoryId = categoryId;
        product.subcategoryId = subcategoryId || null;
        product.unitId = unitId;
        product.quantity = Number(quantity);
        product.stock = Number(stock);
        product.price = Number(price);
        product.description = description?.trim();
        product.specifications = specifications || {};
        product.featured = featured === true || featured === 'true';
        product.isPopular = isPopular === true || isPopular === 'true';
        product.isTrending = isTrending === true || isTrending === 'true';
        product.isBestSeller = isBestSeller === true || isBestSeller === 'true';
        if (images && Array.isArray(images)) {
            const updatedImages = [];
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    const uploadRes = await cloudinary_1.default.uploader.upload(img, {
                        folder: 'natural_ayam/products',
                    });
                    updatedImages.push(uploadRes.secure_url);
                }
                else if (img.startsWith('http')) {
                    updatedImages.push(img);
                }
            }
            product.images = updatedImages;
        }
        await product.save();
        res.status(200).json({ success: true, message: 'Product updated successfully!', data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error updating product' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel_1.ProductModel.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, message: 'Product deleted successfully!' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error deleting product' });
    }
};
exports.deleteProduct = deleteProduct;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel_1.ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching product' });
    }
};
exports.getProductById = getProductById;
const toggleProductHighlight = async (req, res) => {
    try {
        const { id } = req.params;
        const { field, value } = req.body;
        const allowedFields = ['featured', 'isPopular', 'isTrending', 'isBestSeller'];
        if (!allowedFields.includes(field)) {
            return res.status(400).json({ success: false, message: 'Invalid highlight field' });
        }
        const product = await ProductModel_1.ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product[field] = !!value;
        await product.save();
        res.status(200).json({ success: true, message: `Product ${field} updated successfully`, data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleProductHighlight = toggleProductHighlight;
