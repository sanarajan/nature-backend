import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AddComboOfferUseCase, GetAllComboOffersUseCase, UpdateComboOfferUseCase, DeleteComboOfferUseCase, ToggleComboOfferStatusUseCase } from '../../application/usecases/admin/AdminComboOfferUseCases';

@injectable()
export class AdminComboOfferController {
    constructor(
        @inject('IAddComboOfferUseCase') private addComboOfferUseCase: AddComboOfferUseCase,
        @inject('IGetAllComboOffersUseCase') private getAllComboOffersUseCase: GetAllComboOffersUseCase,
        @inject('IUpdateComboOfferUseCase') private updateComboOfferUseCase: UpdateComboOfferUseCase,
        @inject('IDeleteComboOfferUseCase') private deleteComboOfferUseCase: DeleteComboOfferUseCase,
        @inject('IToggleComboOfferStatusUseCase') private toggleComboOfferStatusUseCase: ToggleComboOfferStatusUseCase
    ) {}

    createComboOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newComboOffer = await this.addComboOfferUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Combo Offer created successfully', data: newComboOffer });
        } catch (error: any) {
            next(error);
        }
    };

    getComboOffers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const offers = await this.getAllComboOffersUseCase.execute();
            res.status(200).json({ success: true, data: offers });
        } catch (error: any) {
            next(error);
        }
    };

    updateComboOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedOffer = await this.updateComboOfferUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Combo Offer updated successfully', data: updatedOffer });
        } catch (error: any) {
            next(error);
        }
    };

    deleteComboOffer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteComboOfferUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Combo Offer deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const offer = await this.toggleComboOfferStatusUseCase.execute(id);
            res.status(200).json({ success: true, message: `Combo Offer status toggled`, data: offer });
        } catch (error: any) {
            next(error);
        }
    };
}
