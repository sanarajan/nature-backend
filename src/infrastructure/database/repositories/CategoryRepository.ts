import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { CategoryModel, ICategoryDocument } from '../models/CategoryModel';

export class CategoryRepository implements ICategoryRepository {
    async createCategory(categoryData: Partial<ICategoryDocument>): Promise<ICategoryDocument> {
        const category = new CategoryModel(categoryData);
        return await category.save();
    }

    async findById(id: string): Promise<ICategoryDocument | null> {
        return await CategoryModel.findById(id);
    }

    async findByName(name: string): Promise<ICategoryDocument | null> {
        return await CategoryModel.findOne({ categoryName: { $regex: new RegExp(`^${name}$`, 'i') } });
    }

    async findByNameExcludingId(name: string, excludeId: string): Promise<ICategoryDocument | null> {
        return await CategoryModel.findOne({
            categoryName: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: excludeId }
        });
    }

    async findAll(activeOnly?: boolean): Promise<ICategoryDocument[]> {
        const query = activeOnly ? { isActive: true } : {};
        return await CategoryModel.find(query).sort({ categoryName: 1 });
    }

    async updateCategory(id: string, categoryData: Partial<ICategoryDocument>): Promise<ICategoryDocument | null> {
        return await CategoryModel.findByIdAndUpdate(
            id,
            categoryData,
            { new: true, runValidators: true }
        );
    }

    async deleteCategory(id: string): Promise<ICategoryDocument | null> {
        return await CategoryModel.findByIdAndDelete(id);
    }
}
