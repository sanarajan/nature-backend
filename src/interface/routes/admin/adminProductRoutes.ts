import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminProductController } from '../../controllers/AdminProductController';

const router = Router();
const controller = container.resolve(AdminProductController);

router.get('/options', adminAuthProtect, (req, res, next) => controller.getProductOptions(req, res, next));
router.get('/', adminAuthProtect, (req, res, next) => controller.getAllProducts(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => controller.addProduct(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => controller.getProductById(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => controller.updateProduct(req, res, next));
router.patch('/:id/highlight', adminAuthProtect, (req, res, next) => controller.toggleProductHighlight(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => controller.deleteProduct(req, res, next));

export default router;
