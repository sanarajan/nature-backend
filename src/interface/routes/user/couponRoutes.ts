import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { CouponController } from '../../controllers/CouponController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const couponController = container.resolve(CouponController);

router.get('/active', userAuthProtect, (req, res) => couponController.getActiveCoupons(req, res));
router.post('/validate', userAuthProtect, (req, res) => couponController.validateCoupon(req, res));

export default router;
