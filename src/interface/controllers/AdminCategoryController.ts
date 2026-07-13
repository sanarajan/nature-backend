import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddCategoryUseCase, GetAllCategoriesUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase } from '../../application/usecases/admin/AdminCategoryUseCases';

@injectable()
export class AdminCategoryController {
    constructor(
        @inject('IAddCategoryUseCase') private addCategoryUseCase: AddCategoryUseCase,
        @inject('IGetAllCategoriesUseCase') private getAllCategoriesUseCase: GetAllCategoriesUseCase,
        @inject('IUpdateCategoryUseCase') private updateCategoryUseCase: UpdateCategoryUseCase,
        @inject('IDeleteCategoryUseCase') private deleteCategoryUseCase: DeleteCategoryUseCase
    ) {}

    addCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newCategory = await this.addCategoryUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
        } catch (error: any) {
            next(error);
        }
    };

    getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const categories = await this.getAllCategoriesUseCase.execute();
            res.status(200).json({ success: true, data: categories });
        } catch (error: any) {
            next(error);
        }
    };

    updateCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedCategory = await this.updateCategoryUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Category updated successfully', data: updatedCategory });
        } catch (error: any) {
            next(error);
        }
    };

    deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteCategoryUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Category deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}

