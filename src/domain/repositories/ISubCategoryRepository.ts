import { ISubCategoryDocument } from '../../infrastructure/database/models/SubCategoryModel';

export interface ISubCategoryRepository {
    createSubCategory(data: Partial<ISubCategoryDocument>): Promise<ISubCategoryDocument>;
    findByNameAndCategory(name: string, categoryId: string): Promise<ISubCategoryDocument | null>;
    findByNameAndCategoryExcludingId(name: string, categoryId: string, excludeId: string): Promise<ISubCategoryDocument | null>;
    findAllActive(): Promise<ISubCategoryDocument[]>;
    findAllWithCategory(): Promise<ISubCategoryDocument[]>;
    updateSubCategory(id: string, data: Partial<ISubCategoryDocument>): Promise<ISubCategoryDocument | null>;
    deleteSubCategory(id: string): Promise<ISubCategoryDocument | null>;
}
