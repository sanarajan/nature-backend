import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminOfferController } from '../../controllers/AdminOfferController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const controller = container.resolve(AdminOfferController);

router.post('/', adminAuthProtect, (req, res, next) => controller.createOffer(req, res, next));
router.get('/', adminAuthProtect, (req, res, next) => controller.getOffers(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => controller.updateOffer(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => controller.deleteOffer(req, res, next));
router.patch('/:id/toggle', adminAuthProtect, (req, res, next) => controller.toggleStatus(req, res, next));

export default router;
