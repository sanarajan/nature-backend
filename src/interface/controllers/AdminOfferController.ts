import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddOfferUseCase, GetAllOffersUseCase, UpdateOfferUseCase, DeleteOfferUseCase, ToggleOfferStatusUseCase } from '../../application/usecases/admin/AdminOfferUseCases';

@injectable()
export class AdminOfferController {
    constructor(
        @inject('IAddOfferUseCase') private addOfferUseCase: AddOfferUseCase,
        @inject('IGetAllOffersUseCase') private getAllOffersUseCase: GetAllOffersUseCase,
        @inject('IUpdateOfferUseCase') private updateOfferUseCase: UpdateOfferUseCase,
        @inject('IDeleteOfferUseCase') private deleteOfferUseCase: DeleteOfferUseCase,
        @inject('IToggleOfferStatusUseCase') private toggleOfferStatusUseCase: ToggleOfferStatusUseCase
    ) {}

    createOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newOffer = await this.addOfferUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Offer created successfully', data: newOffer });
        } catch (error: any) {
            next(error);
        }
    };

    getOffers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const offers = await this.getAllOffersUseCase.execute();
            res.status(200).json({ success: true, data: offers });
        } catch (error: any) {
            next(error);
        }
    };

    updateOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedOffer = await this.updateOfferUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Offer updated successfully', data: updatedOffer });
        } catch (error: any) {
            next(error);
        }
    };

    deleteOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteOfferUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Offer deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const offer = await this.toggleOfferStatusUseCase.execute(id);
            res.status(200).json({ success: true, message: `Offer ${offer?.status ? 'activated' : 'deactivated'} successfully`, data: offer });
        } catch (error: any) {
            next(error);
        }
    };
}
