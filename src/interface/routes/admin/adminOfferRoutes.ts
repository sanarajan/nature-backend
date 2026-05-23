import { Router } from 'express';
import { AdminOfferController } from '../../controllers/AdminOfferController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const controller = new AdminOfferController();

router.post('/', adminAuthProtect, (req, res) => controller.createOffer(req, res));
router.get('/', adminAuthProtect, (req, res) => controller.getOffers(req, res));
router.put('/:id', adminAuthProtect, (req, res) => controller.updateOffer(req, res));
router.delete('/:id', adminAuthProtect, (req, res) => controller.deleteOffer(req, res));
router.patch('/:id/toggle', adminAuthProtect, (req, res) => controller.toggleStatus(req, res));

export default router;
