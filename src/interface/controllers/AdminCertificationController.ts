import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AdminCertificationUseCases } from '../../application/usecases/admin/AdminCertificationUseCases';

@injectable()
export class AdminCertificationController {
    constructor(
        @inject(AdminCertificationUseCases) private adminCertificationUseCases: AdminCertificationUseCases
    ) {}

    addCertification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminCertificationUseCases.addCertification(req.body);
            res.status(201).json({ success: true, data, message: 'Certification added successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    getAllCertifications = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminCertificationUseCases.getAllCertifications();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    getCertificationById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid certification ID' });
            }
            const data = await this.adminCertificationUseCases.getCertificationById(id);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    editCertification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid certification ID' });
            }
            const data = await this.adminCertificationUseCases.editCertification(id, req.body);
            res.status(200).json({ success: true, data, message: 'Certification updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    deleteCertification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid certification ID' });
            }
            await this.adminCertificationUseCases.deleteCertification(id);
            res.status(200).json({ success: true, message: 'Certification deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}
