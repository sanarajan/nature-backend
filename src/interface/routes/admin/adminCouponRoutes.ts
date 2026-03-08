import express from 'express';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import {
    addCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
} from '../../controllers/AdminCouponController';

const router = express.Router();

router.get('/', adminAuthProtect, getAllCoupons);
router.post('/add', adminAuthProtect, addCoupon);
router.get('/:id', adminAuthProtect, getCouponById);
router.put('/:id', adminAuthProtect, updateCoupon);
router.delete('/:id', adminAuthProtect, deleteCoupon);
router.patch('/:id/toggle-status', adminAuthProtect, toggleCouponStatus);

export default router;
