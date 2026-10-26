import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { injectable, inject } from 'tsyringe';
import { AdminBlogUseCases } from '../../application/usecases/admin/AdminBlogUseCases';

@injectable()
export class AdminBlogController {
    constructor(
        @inject(AdminBlogUseCases) private adminBlogUseCases: AdminBlogUseCases
    ) {}

    addBlog = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminBlogUseCases.addBlog(req.body);
            res.status(201).json({ success: true, data, message: 'Blog added successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    getAllBlogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.adminBlogUseCases.getAllBlogs();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    getBlogById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog ID' });
            }
            const data = await this.adminBlogUseCases.getBlogById(id);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    editBlog = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog ID' });
            }
            const data = await this.adminBlogUseCases.editBlog(id, req.body);
            res.status(200).json({ success: true, data, message: 'Blog updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    deleteBlog = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog ID' });
            }
            await this.adminBlogUseCases.deleteBlog(id);
            res.status(200).json({ success: true, message: 'Blog deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleBlogStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog ID' });
            }
            const { status } = req.body || {};
            const data = await this.adminBlogUseCases.toggleBlogStatus(id, status);
            res.status(200).json({
                success: true,
                data,
                message: `Blog status successfully changed to ${data?.status}`
            });
        } catch (error: any) {
            next(error);
        }
    };
}
