import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetCategoriesWithCountsUseCase, GetCategoryHierarchyUseCase } from '../../application/usecases/catalog/CategoryUseCases';

@injectable()
export class CategoryController {
    constructor(
        @inject('IGetCategoriesWithCountsUseCase') private getCategoriesWithCountsUseCase: GetCategoriesWithCountsUseCase,
        @inject('IGetCategoryHierarchyUseCase') private getCategoryHierarchyUseCase: GetCategoryHierarchyUseCase
    ) {}

    getCategoriesWithCounts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.getCategoriesWithCountsUseCase.execute();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    getCategoryHierarchy = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.getCategoryHierarchyUseCase.execute();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };
}

