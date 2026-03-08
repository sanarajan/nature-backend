import { Router } from 'express';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { getAllOrders, getOrderById, updateOrderStatus, updatePaymentStatus } from '../../controllers/AdminOrderController';

const router = Router();

router.get('/', adminAuthProtect, getAllOrders);
router.get('/:id', adminAuthProtect, getOrderById);
router.patch('/:id/status', adminAuthProtect, updateOrderStatus);
router.patch('/:id/payment-status', adminAuthProtect, updatePaymentStatus);

export default router;
