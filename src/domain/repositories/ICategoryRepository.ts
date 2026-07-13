import { ICategoryDocument } from '../../infrastructure/database/models/CategoryModel';

export interface ICategoryRepository {
    createCategory(categoryData: Partial<ICategoryDocument>): Promise<ICategoryDocument>;
    findById(id: string): Promise<ICategoryDocument | null>;
    findByName(name: string): Promise<ICategoryDocument | null>;
    findByNameExcludingId(name: string, excludeId: string): Promise<ICategoryDocument | null>;
    findAll(activeOnly?: boolean): Promise<ICategoryDocument[]>;
    updateCategory(id: string, categoryData: Partial<ICategoryDocument>): Promise<ICategoryDocument | null>;
    deleteCategory(id: string): Promise<ICategoryDocument | null>;
}
