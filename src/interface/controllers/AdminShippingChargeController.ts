import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import {
    GetShippingChargesUseCase,
    AddOrUpdateShippingChargeUseCase,
    DeleteShippingChargeUseCase,
    GetStatesUseCase
} from '../../application/usecases/admin/AdminShippingChargeUseCases';

@injectable()
export class AdminShippingChargeController {
    constructor(
        @inject('IGetShippingChargesUseCase') private getShippingChargesUseCase: GetShippingChargesUseCase,
        @inject('IAddOrUpdateShippingChargeUseCase') private addOrUpdateShippingChargeUseCase: AddOrUpdateShippingChargeUseCase,
        @inject('IDeleteShippingChargeUseCase') private deleteShippingChargeUseCase: DeleteShippingChargeUseCase,
        @inject('IGetStatesUseCase') private getStatesUseCase: GetStatesUseCase
    ) {}

    getShippingCharges = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const charges = await this.getShippingChargesUseCase.execute();
            res.status(200).json({ success: true, data: charges });
        } catch (error: any) {
            next(error);
        }
    };

    addOrUpdateShippingCharge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const shippingCharge = await this.addOrUpdateShippingChargeUseCase.execute(req.body);
            res.status(200).json({ success: true, message: 'Shipping charge updated successfully', data: shippingCharge });
        } catch (error: any) {
            next(error);
        }
    };

    deleteShippingCharge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteShippingChargeUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Shipping charge deleted' });
        } catch (error: any) {
            next(error);
        }
    };

    getStates = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const states = await this.getStatesUseCase.execute();
            res.status(200).json({ success: true, data: states });
        } catch (error: any) {
            next(error);
        }
    };
}
