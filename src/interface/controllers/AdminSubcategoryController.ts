import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddSubcategoryUseCase, GetAllSubcategoriesUseCase, UpdateSubcategoryUseCase, DeleteSubcategoryUseCase } from '../../application/usecases/admin/AdminSubcategoryUseCases';

@injectable()
export class AdminSubcategoryController {
    constructor(
        @inject('IAddSubcategoryUseCase') private addSubcategoryUseCase: AddSubcategoryUseCase,
        @inject('IGetAllSubcategoriesUseCase') private getAllSubcategoriesUseCase: GetAllSubcategoriesUseCase,
        @inject('IUpdateSubcategoryUseCase') private updateSubcategoryUseCase: UpdateSubcategoryUseCase,
        @inject('IDeleteSubcategoryUseCase') private deleteSubcategoryUseCase: DeleteSubcategoryUseCase
    ) {}

    addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newSubcategory = await this.addSubcategoryUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Subcategory created successfully', data: newSubcategory });
        } catch (error: any) {
            next(error);
        }
    };

    getAllSubcategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const subcategories = await this.getAllSubcategoriesUseCase.execute();
            res.status(200).json({ success: true, data: subcategories });
        } catch (error: any) {
            next(error);
        }
    };

    updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedSubcategory = await this.updateSubcategoryUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Subcategory updated successfully', data: updatedSubcategory });
        } catch (error: any) {
            next(error);
        }
    };

    deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteSubcategoryUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Subcategory deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}
