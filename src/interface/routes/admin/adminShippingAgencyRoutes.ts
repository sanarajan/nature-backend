import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { ShippingAgencyController } from '../../controllers/ShippingAgencyController';

const router = express.Router();
const controller = container.resolve(ShippingAgencyController);

router.post('/', (req, res, next) => controller.addShippingAgency(req, res, next));
router.get('/', (req, res, next) => controller.getAllShippingAgencies(req, res, next));
router.put('/:id', (req, res, next) => controller.updateShippingAgency(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteShippingAgency(req, res, next));

export default router;
