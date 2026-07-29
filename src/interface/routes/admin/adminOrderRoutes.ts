import { Router } from 'express';
import { adminAuthProtect, adminOnly } from '../../../middleware/adminAuthMiddleware';
import { container } from '../../../infrastructure/config/container';
import { AdminOrderController } from '../../controllers/AdminOrderController';

const router = Router();
const controller = container.resolve(AdminOrderController);

router.get('/', adminAuthProtect, (req, res, next) => controller.getAllOrders(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => controller.getOrderById(req, res, next));
router.patch('/:id/status', adminAuthProtect, (req, res, next) => controller.updateOrderStatus(req, res, next));
router.patch('/:id/payment-status', adminAuthProtect, adminOnly, (req, res, next) => controller.updatePaymentStatus(req, res, next));

// Return Request actions
router.patch('/:id/item/:productId/return/accept', adminAuthProtect, adminOnly, (req, res, next) => controller.acceptReturnRequest(req, res, next));
router.patch('/:id/item/:productId/return/reject', adminAuthProtect, adminOnly, (req, res, next) => controller.rejectReturnRequest(req, res, next));
router.patch('/:id/item/:productId/return/complete', adminAuthProtect, adminOnly, (req, res, next) => controller.completeReturn(req, res, next));

// Cancellation Request actions
router.patch('/:id/item/:productId/cancel/accept', adminAuthProtect, adminOnly, (req, res, next) => controller.acceptCancellationRequest(req, res, next));
router.patch('/:id/item/:productId/cancel/reject', adminAuthProtect, adminOnly, (req, res, next) => controller.rejectCancellationRequest(req, res, next));

// Delivery Delay Update
router.patch('/:id/item/:productId/delivery-update', adminAuthProtect, (req, res, next) => controller.updateDeliveryDelay(req, res, next));

export default router;
