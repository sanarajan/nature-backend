import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { addCategory, getAllCategories, updateCategory, deleteCategory } from '../../controllers/AdminCategoryController';

const router = Router();

router.get('/', adminAuthProtect, getAllCategories);
router.post('/', adminAuthProtect, addCategory);
router.put('/:id', adminAuthProtect, updateCategory);
router.delete('/:id', adminAuthProtect, deleteCategory);

export default router;
