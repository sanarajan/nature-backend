import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminCategoryController } from '../../controllers/AdminCategoryController';

const router = Router();
const adminCategoryController = container.resolve(AdminCategoryController);

router.get('/', adminAuthProtect, (req, res, next) => adminCategoryController.getAllCategories(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminCategoryController.addCategory(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminCategoryController.updateCategory(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminCategoryController.deleteCategory(req, res, next));

export default router;
