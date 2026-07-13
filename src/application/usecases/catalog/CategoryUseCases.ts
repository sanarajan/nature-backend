import { inject, injectable } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { ISubCategoryRepository } from '../../../domain/repositories/ISubCategoryRepository';

@injectable()
export class GetCategoriesWithCountsUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute() {
        const categories = await this.categoryRepository.findAll(true);
        const counts = await this.productRepository.getProductCountsByCategory();

        const countMap: Record<string, number> = {};
        counts.forEach(item => {
            if (item._id) {
                countMap[item._id.toString()] = item.count;
            }
        });

        return categories.map(cat => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            description: cat.description,
            productCount: countMap[cat._id?.toString() || ''] || 0
        }));
    }
}

@injectable()
export class GetCategoryHierarchyUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository,
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository
    ) {}

    async execute() {
        const categories = await this.categoryRepository.findAll(true);
        const subcategories = await this.subCategoryRepository.findAllActive();

        return categories.map(cat => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            subcategories: subcategories
                .filter(sub => sub.categoryId?.toString() === cat._id?.toString())
                .map(sub => ({
                    _id: sub._id,
                    subcategoryName: sub.subcategoryName
                }))
        }));
    }
}
