import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { getProductOptions, addProduct, getAllProducts, updateProduct, deleteProduct, getProductById, toggleProductHighlight } from '../../controllers/AdminProductController';

const router = Router();

router.get('/options', adminAuthProtect, getProductOptions);
router.get('/', adminAuthProtect, getAllProducts);
router.post('/', adminAuthProtect, addProduct);
router.get('/:id', adminAuthProtect, getProductById);
router.put('/:id', adminAuthProtect, updateProduct);
router.patch('/:id/highlight', adminAuthProtect, toggleProductHighlight);
router.delete('/:id', adminAuthProtect, deleteProduct);

export default router;
