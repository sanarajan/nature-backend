import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { injectable, inject } from 'tsyringe';
import { AdminNewsUseCases } from '../../application/usecases/admin/AdminNewsUseCases';

@injectable()
export class AdminNewsController {
    constructor(
        @inject(AdminNewsUseCases) private adminNewsUseCases: AdminNewsUseCases
    ) {}

    addNews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminNewsUseCases.addNews(req.body);
            res.status(201).json({ success: true, data, message: 'News added successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    getAllNews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminNewsUseCases.getAllNews();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    getNewsById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid news ID' });
            }
            const data = await this.adminNewsUseCases.getNewsById(id);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    editNews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid news ID' });
            }
            const data = await this.adminNewsUseCases.editNews(id, req.body);
            res.status(200).json({ success: true, data, message: 'News updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    deleteNews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid news ID' });
            }
            await this.adminNewsUseCases.deleteNews(id);
            res.status(200).json({ success: true, message: 'News deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleNewsStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid news ID' });
            }
            const { status } = req.body || {};
            const data = await this.adminNewsUseCases.toggleNewsStatus(id, status);
            res.status(200).json({ 
                success: true, 
                data, 
                message: `News status successfully changed to ${data?.status}` 
            });
        } catch (error: any) {
            next(error);
        }
    };
}
