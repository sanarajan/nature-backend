import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminSubcategoryController } from '../../controllers/AdminSubcategoryController';

const router = Router();
const adminSubcategoryController = container.resolve(AdminSubcategoryController);

router.get('/', adminAuthProtect, (req, res, next) => adminSubcategoryController.getAllSubcategories(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminSubcategoryController.addSubcategory(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminSubcategoryController.updateSubcategory(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminSubcategoryController.deleteSubcategory(req, res, next));

export default router;
