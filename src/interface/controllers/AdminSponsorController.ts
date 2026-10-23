import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AdminSponsorUseCases } from '../../application/usecases/admin/AdminSponsorUseCases';

@injectable()
export class AdminSponsorController {
    constructor(
        @inject(AdminSponsorUseCases) private adminSponsorUseCases: AdminSponsorUseCases
    ) {}

    addSponsor = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminSponsorUseCases.addSponsor(req.body);
            res.status(201).json({ success: true, data, message: 'Sponsor added successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    getAllSponsors = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminSponsorUseCases.getAllSponsors();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    getSponsorById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
            }
            const data = await this.adminSponsorUseCases.getSponsorById(id);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    editSponsor = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
            }
            const data = await this.adminSponsorUseCases.editSponsor(id, req.body);
            res.status(200).json({ success: true, data, message: 'Sponsor updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    deleteSponsor = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
            }
            await this.adminSponsorUseCases.deleteSponsor(id);
            res.status(200).json({ success: true, message: 'Sponsor deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleSponsorStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
            }
            const { status } = req.body || {};
            const data = await this.adminSponsorUseCases.toggleSponsorStatus(id, status);
            res.status(200).json({ 
                success: true, 
                data, 
                message: `Sponsor status successfully changed to ${data?.status}` 
            });
        } catch (error: any) {
            next(error);
        }
    };
}
