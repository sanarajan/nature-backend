import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminNewsController } from '../../controllers/AdminNewsController';

const router = Router();
const adminNewsController = container.resolve(AdminNewsController);

router.get('/', adminAuthProtect, (req, res, next) => adminNewsController.getAllNews(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => adminNewsController.getNewsById(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminNewsController.addNews(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminNewsController.editNews(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminNewsController.deleteNews(req, res, next));
router.patch('/:id/toggle-status', adminAuthProtect, (req, res, next) => adminNewsController.toggleNewsStatus(req, res, next));
router.patch('/:id/status', adminAuthProtect, (req, res, next) => adminNewsController.toggleNewsStatus(req, res, next));

export default router;
