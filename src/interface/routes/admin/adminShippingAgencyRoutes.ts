import express from 'express';
import {
    addShippingAgency,
    getAllShippingAgencies,
    updateShippingAgency,
    deleteShippingAgency
} from '../../controllers/ShippingAgencyController';

const router = express.Router();

router.post('/', addShippingAgency);
router.get('/', getAllShippingAgencies);
router.put('/:id', updateShippingAgency);
router.delete('/:id', deleteShippingAgency);

export default router;
