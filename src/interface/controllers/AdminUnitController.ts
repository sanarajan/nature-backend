import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddUnitUseCase, GetAllUnitsUseCase, GetUnitByIdUseCase, UpdateUnitUseCase, DeleteUnitUseCase } from '../../application/usecases/admin/AdminUnitUseCases';

@injectable()
export class AdminUnitController {
    constructor(
        @inject('IAddUnitUseCase') private addUnitUseCase: AddUnitUseCase,
        @inject('IGetAllUnitsUseCase') private getAllUnitsUseCase: GetAllUnitsUseCase,
        @inject('IGetUnitByIdUseCase') private getUnitByIdUseCase: GetUnitByIdUseCase,
        @inject('IUpdateUnitUseCase') private updateUnitUseCase: UpdateUnitUseCase,
        @inject('IDeleteUnitUseCase') private deleteUnitUseCase: DeleteUnitUseCase
    ) {}

    addUnit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newUnit = await this.addUnitUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Unit created successfully', data: newUnit });
        } catch (error: any) {
            next(error);
        }
    };

    getAllUnits = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const units = await this.getAllUnitsUseCase.execute();
            res.status(200).json({ success: true, data: units });
        } catch (error: any) {
            next(error);
        }
    };

    getUnitById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const unit = await this.getUnitByIdUseCase.execute(id);
            res.status(200).json({ success: true, data: unit });
        } catch (error: any) {
            next(error);
        }
    };

    updateUnit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedUnit = await this.updateUnitUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Unit updated successfully', data: updatedUnit });
        } catch (error: any) {
            next(error);
        }
    };

    deleteUnit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteUnitUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Unit deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}
