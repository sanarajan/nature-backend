import { inject, injectable } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { ICategoryDocument } from '../../../infrastructure/database/models/CategoryModel';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AddCategoryUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository
    ) {}

    async execute(data: { categoryName: string; description?: string; isActive?: boolean; imageUrl?: string }) {
        if (!data.categoryName) {
            throw new AppError('Category name is required', STATUS_CODES.BAD_REQUEST);
        }

        const existingCategory = await this.categoryRepository.findByName(data.categoryName);
        if (existingCategory) {
            throw new AppError('Category name already exists', STATUS_CODES.BAD_REQUEST);
        }

        let uploadedImageUrl = data.imageUrl;
        if (data.imageUrl && data.imageUrl.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(data.imageUrl, {
                folder: 'natural_ayam/categories',
            });
            uploadedImageUrl = uploadRes.secure_url;
        }

        return await this.categoryRepository.createCategory({
            categoryName: data.categoryName,
            description: data.description,
            imageUrl: uploadedImageUrl,
            isActive: data.isActive !== undefined ? data.isActive : true
        });
    }
}

@injectable()
export class GetAllCategoriesUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository
    ) {}

    async execute() {
        return await this.categoryRepository.findAll(false);
    }
}

@injectable()
export class UpdateCategoryUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository
    ) {}

    async execute(id: string, data: { categoryName: string; description?: string; isActive?: boolean; imageUrl?: string }) {
        if (!data.categoryName) {
            throw new AppError('Category name is required', STATUS_CODES.BAD_REQUEST);
        }

        const existingCategory = await this.categoryRepository.findByNameExcludingId(data.categoryName, id);
        if (existingCategory) {
            throw new AppError('Category name already exists', STATUS_CODES.BAD_REQUEST);
        }

        let uploadedImageUrl = data.imageUrl;
        if (data.imageUrl && data.imageUrl.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(data.imageUrl, {
                folder: 'natural_ayam/categories',
            });
            uploadedImageUrl = uploadRes.secure_url;
        }

        const updatedCategory = await this.categoryRepository.updateCategory(id, {
            categoryName: data.categoryName,
            description: data.description,
            imageUrl: uploadedImageUrl,
            isActive: data.isActive
        });

        if (!updatedCategory) {
            throw new AppError('Category not found', STATUS_CODES.NOT_FOUND);
        }

        return updatedCategory;
    }
}

@injectable()
export class DeleteCategoryUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string) {
        const productsCount = await this.productRepository.countByCategoryId(id);
        if (productsCount > 0) {
            throw new AppError('Cannot delete category because it is already associated with one or more products.', STATUS_CODES.BAD_REQUEST);
        }

        const deletedCategory = await this.categoryRepository.deleteCategory(id);
        if (!deletedCategory) {
            throw new AppError('Category not found', STATUS_CODES.NOT_FOUND);
        }

        return deletedCategory;
    }
}
