import { Router } from 'express';
import { AdminComboOfferController } from '../../controllers/AdminComboOfferController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const controller = new AdminComboOfferController();

router.post('/', adminAuthProtect, (req, res) => controller.createComboOffer(req, res));
router.get('/list', adminAuthProtect, (req, res) => controller.getComboOffers(req, res));
router.put('/:id', adminAuthProtect, (req, res) => controller.updateComboOffer(req, res));
router.delete('/:id', adminAuthProtect, (req, res) => controller.deleteComboOffer(req, res));
router.put('/:id/toggle', adminAuthProtect, (req, res) => controller.toggleStatus(req, res));

export default router;
