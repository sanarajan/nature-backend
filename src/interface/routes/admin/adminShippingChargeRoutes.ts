import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminShippingChargeController } from '../../controllers/AdminShippingChargeController';

const router = Router();
const controller = container.resolve(AdminShippingChargeController);

router.get('/shipping-charges', (req, res, next) => controller.getShippingCharges(req, res, next));
router.post('/shipping-charges', (req, res, next) => controller.addOrUpdateShippingCharge(req, res, next));
router.delete('/shipping-charges/:id', (req, res, next) => controller.deleteShippingCharge(req, res, next));
router.get('/states', (req, res, next) => controller.getStates(req, res, next));

export default router;
