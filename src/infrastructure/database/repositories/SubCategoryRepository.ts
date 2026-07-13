import { ISubCategoryRepository } from '../../../domain/repositories/ISubCategoryRepository';
import { SubCategoryModel, ISubCategoryDocument } from '../models/SubCategoryModel';

export class SubCategoryRepository implements ISubCategoryRepository {
    async createSubCategory(data: Partial<ISubCategoryDocument>): Promise<ISubCategoryDocument> {
        const subcategory = new SubCategoryModel(data);
        return await subcategory.save();
    }

    async findByNameAndCategory(name: string, categoryId: string): Promise<ISubCategoryDocument | null> {
        return await SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${name}$`, 'i') },
            categoryId
        });
    }

    async findByNameAndCategoryExcludingId(name: string, categoryId: string, excludeId: string): Promise<ISubCategoryDocument | null> {
        return await SubCategoryModel.findOne({
            subcategoryName: { $regex: new RegExp(`^${name}$`, 'i') },
            categoryId,
            _id: { $ne: excludeId }
        });
    }

    async findAllActive(): Promise<ISubCategoryDocument[]> {
        return await SubCategoryModel.find({ isActive: true }).sort({ subcategoryName: 1 });
    }

    async findAllWithCategory(): Promise<ISubCategoryDocument[]> {
        return await SubCategoryModel.find()
            .populate({ path: 'categoryId', model: 'Category', select: 'categoryName' })
            .sort({ createdAt: -1 });
    }

    async updateSubCategory(id: string, data: Partial<ISubCategoryDocument>): Promise<ISubCategoryDocument | null> {
        return await SubCategoryModel.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );
    }

    async deleteSubCategory(id: string): Promise<ISubCategoryDocument | null> {
        return await SubCategoryModel.findByIdAndDelete(id);
    }
}
