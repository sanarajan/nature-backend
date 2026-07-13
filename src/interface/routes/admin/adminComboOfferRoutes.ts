import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminComboOfferController } from '../../controllers/AdminComboOfferController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const controller = container.resolve(AdminComboOfferController);

router.post('/', adminAuthProtect, (req, res, next) => controller.createComboOffer(req, res, next));
router.get('/list', adminAuthProtect, (req, res, next) => controller.getComboOffers(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => controller.updateComboOffer(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => controller.deleteComboOffer(req, res, next));
router.put('/:id/toggle', adminAuthProtect, (req, res, next) => controller.toggleStatus(req, res, next));

export default router;
