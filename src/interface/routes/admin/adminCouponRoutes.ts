import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminCouponController } from '../../controllers/AdminCouponController';

const router = express.Router();
const adminCouponController = container.resolve(AdminCouponController);

router.get('/', adminAuthProtect, (req, res) => adminCouponController.getAllCoupons(req, res));
router.post('/add', adminAuthProtect, (req, res) => adminCouponController.addCoupon(req, res));
router.get('/:id', adminAuthProtect, (req, res) => adminCouponController.getCouponById(req, res));
router.put('/:id', adminAuthProtect, (req, res) => adminCouponController.updateCoupon(req, res));
router.delete('/:id', adminAuthProtect, (req, res) => adminCouponController.deleteCoupon(req, res));
router.patch('/:id/toggle-status', adminAuthProtect, (req, res) => adminCouponController.toggleCouponStatus(req, res));

export default router;
