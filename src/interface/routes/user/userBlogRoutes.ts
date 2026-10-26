import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { container } from '../../../infrastructure/config/container';
import { IBlogRepository } from '../../../domain/repositories/IBlogRepository';

const router = Router();
const blogRepository = container.resolve<IBlogRepository>('IBlogRepository');

/**
 * GET /api/user/blogs
 * Public endpoint to retrieve all published/active blogs.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await blogRepository.findActive();
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        next(error);
    }
});

/**
 * GET /api/user/blogs/:id
 * Public endpoint to retrieve a single published/active blog by ID.
 * Returns 404 if the blog does not exist or is inactive/unpublished.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid blog ID' });
        }

        const blog = await blogRepository.findById(id);
        if (!blog || blog.status !== 'active') {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.status(200).json({ success: true, data: blog });
    } catch (error: any) {
        next(error);
    }
});

export default router;
