import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminBlogController } from '../../controllers/AdminBlogController';

const router = Router();
const adminBlogController = container.resolve(AdminBlogController);

router.get('/', adminAuthProtect, (req, res, next) => adminBlogController.getAllBlogs(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => adminBlogController.getBlogById(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminBlogController.addBlog(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminBlogController.editBlog(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminBlogController.deleteBlog(req, res, next));
router.patch('/:id/toggle-status', adminAuthProtect, (req, res, next) => adminBlogController.toggleBlogStatus(req, res, next));
router.patch('/:id/status', adminAuthProtect, (req, res, next) => adminBlogController.toggleBlogStatus(req, res, next));

export default router;
