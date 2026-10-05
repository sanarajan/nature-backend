import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { ProductModel } from '../models/ProductModel';
import mongoose from 'mongoose';

export class ProductRepository implements IProductRepository {
    async findById(id: string): Promise<any> {
        return await ProductModel.findById(id).populate('categoryId', 'categoryName').populate('subcategoryId', 'subcategoryName').populate('unitId', 'unitName');
    }
    async findProductsByIds(ids: string[]): Promise<any[]> {
        return await ProductModel.find({ _id: { $in: ids } });
    }
    async findProduct(query: any): Promise<any> {
        return await ProductModel.findOne(query);
    }
    async findProducts(query: any, limit?: number, sort?: any, populate?: any): Promise<any[]> {
        let q = ProductModel.find(query);
        if (sort) q = q.sort(sort);
        if (limit) q = q.limit(limit);
        if (populate) {
            if (Array.isArray(populate)) {
                populate.forEach(p => q = q.populate(p));
            } else {
                q = q.populate(populate);
            }
        }
        return await q;
    }
    async findProductBySkuPattern(prefix: string): Promise<any> {
        return await ProductModel.findOne({
            sku: { $regex: new RegExp(`^${prefix}-`, 'i') }
        }).sort({ sku: -1 }).select('sku');
    }
    async createProduct(data: any): Promise<any> {
        const product = new ProductModel(data);
        return await product.save();
    }
    async updateProduct(id: string, data: any): Promise<any> {
        return await ProductModel.findByIdAndUpdate(id, data, { new: true });
    }
    async deleteProduct(id: string): Promise<any> {
        return await ProductModel.findByIdAndDelete(id);
    }
    async countByCategoryId(categoryId: string): Promise<number> {
        return await ProductModel.countDocuments({ categoryId });
    }

    async countBySubcategoryId(subcategoryId: string): Promise<number> {
        return await ProductModel.countDocuments({ subcategoryId });
    }

    async countByUnitId(unitId: string, unitName?: string): Promise<number> {
        let orConditions: any[] = [];
        
        // Handle valid ObjectId
        if (mongoose.Types.ObjectId.isValid(unitId)) {
            orConditions.push({ unitId: new mongoose.Types.ObjectId(unitId) });
        }
        
        // Handle string representation
        orConditions.push({ unitId: unitId });

        // Handle case-insensitive legacy string names if provided
        if (unitName) {
            orConditions.push({ unitId: unitName });
            orConditions.push({ unitId: new RegExp(`^${unitName}$`, 'i') });
        }

        return await ProductModel.collection.countDocuments({ $or: orConditions });
    }

    async getProductCountsByCategory(): Promise<Array<{ _id: string, count: number }>> {
        return await ProductModel.aggregate([
            { $group: { _id: "$categoryId", count: { $sum: 1 } } }
        ]);
    }
}
