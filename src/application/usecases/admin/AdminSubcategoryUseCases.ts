import { inject, injectable } from 'tsyringe';
import { ISubCategoryRepository } from '../../../domain/repositories/ISubCategoryRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AddSubcategoryUseCase {
    constructor(
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository
    ) {}

    async execute(data: { subcategoryName: string; categoryId: string; description?: string; isActive?: boolean }) {
        if (!data.subcategoryName) {
            throw new AppError('Subcategory name is required', STATUS_CODES.BAD_REQUEST);
        }
        if (!data.categoryId) {
            throw new AppError('Parent Category is required', STATUS_CODES.BAD_REQUEST);
        }

        const existingSubcategory = await this.subCategoryRepository.findByNameAndCategory(data.subcategoryName, data.categoryId);
        if (existingSubcategory) {
            throw new AppError('Subcategory name already exists in this category', STATUS_CODES.BAD_REQUEST);
        }

        return await this.subCategoryRepository.createSubCategory({
            subcategoryName: data.subcategoryName,
            categoryId: data.categoryId as any,
            description: data.description,
            isActive: data.isActive !== undefined ? data.isActive : true
        });
    }
}

@injectable()
export class GetAllSubcategoriesUseCase {
    constructor(
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository
    ) {}

    async execute() {
        return await this.subCategoryRepository.findAllWithCategory();
    }
}

@injectable()
export class UpdateSubcategoryUseCase {
    constructor(
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository
    ) {}

    async execute(id: string, data: { subcategoryName: string; categoryId: string; description?: string; isActive?: boolean }) {
        if (!data.subcategoryName) {
            throw new AppError('Subcategory name is required', STATUS_CODES.BAD_REQUEST);
        }

        const existingSubcategory = await this.subCategoryRepository.findByNameAndCategoryExcludingId(data.subcategoryName, data.categoryId, id);
        if (existingSubcategory) {
            throw new AppError('Subcategory name already exists in this category', STATUS_CODES.BAD_REQUEST);
        }

        const updatedSubcategory = await this.subCategoryRepository.updateSubCategory(id, {
            subcategoryName: data.subcategoryName,
            categoryId: data.categoryId as any,
            description: data.description,
            isActive: data.isActive
        });

        if (!updatedSubcategory) {
            throw new AppError('Subcategory not found', STATUS_CODES.NOT_FOUND);
        }

        return updatedSubcategory;
    }
}

@injectable()
export class DeleteSubcategoryUseCase {
    constructor(
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string) {
        const productsCount = await this.productRepository.countBySubcategoryId(id);
        if (productsCount > 0) {
            throw new AppError('Cannot delete subcategory because it is already associated with one or more products.', STATUS_CODES.BAD_REQUEST);
        }

        const deletedSubcategory = await this.subCategoryRepository.deleteSubCategory(id);
        if (!deletedSubcategory) {
            throw new AppError('Subcategory not found', STATUS_CODES.NOT_FOUND);
        }

        return deletedSubcategory;
    }
}
