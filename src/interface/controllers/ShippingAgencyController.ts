import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddShippingAgencyUseCase, GetAllShippingAgenciesUseCase, UpdateShippingAgencyUseCase, DeleteShippingAgencyUseCase } from '../../application/usecases/admin/ShippingAgencyUseCases';

@injectable()
export class ShippingAgencyController {
    constructor(
        @inject('IAddShippingAgencyUseCase') private addShippingAgencyUseCase: AddShippingAgencyUseCase,
        @inject('IGetAllShippingAgenciesUseCase') private getAllShippingAgenciesUseCase: GetAllShippingAgenciesUseCase,
        @inject('IUpdateShippingAgencyUseCase') private updateShippingAgencyUseCase: UpdateShippingAgencyUseCase,
        @inject('IDeleteShippingAgencyUseCase') private deleteShippingAgencyUseCase: DeleteShippingAgencyUseCase
    ) {}

    addShippingAgency = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newAgency = await this.addShippingAgencyUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Shipping agency added successfully', data: newAgency });
        } catch (error: any) {
            next(error);
        }
    };

    getAllShippingAgencies = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const agencies = await this.getAllShippingAgenciesUseCase.execute();
            res.status(200).json({ success: true, data: agencies });
        } catch (error: any) {
            next(error);
        }
    };

    updateShippingAgency = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const agency = await this.updateShippingAgencyUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Shipping agency updated successfully', data: agency });
        } catch (error: any) {
            next(error);
        }
    };

    deleteShippingAgency = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteShippingAgencyUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Shipping agency deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}
