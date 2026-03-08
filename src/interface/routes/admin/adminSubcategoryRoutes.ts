import { Router } from 'express';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import {
    addSubcategory,
    getAllSubcategories,
    updateSubcategory,
    deleteSubcategory
} from '../../controllers/AdminSubcategoryController';

const router = Router();

router.get('/', adminAuthProtect, getAllSubcategories);
router.post('/', adminAuthProtect, addSubcategory);
router.put('/:id', adminAuthProtect, updateSubcategory);
router.delete('/:id', adminAuthProtect, deleteSubcategory);

export default router;
