import { Router } from 'express';
import { AdminShippingChargeController } from '../../controllers/AdminShippingChargeController';

const router = Router();
const controller = new AdminShippingChargeController();

router.get('/shipping-charges', (req, res) => controller.getShippingCharges(req, res));
router.post('/shipping-charges', (req, res) => controller.addOrUpdateShippingCharge(req, res));
router.delete('/shipping-charges/:id', (req, res) => controller.deleteShippingCharge(req, res));
router.get('/states', (req, res) => controller.getStates(req, res));

export default router;
