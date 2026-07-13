import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { UserOrderController } from '../../controllers/UserOrderController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const userOrderController = container.resolve(UserOrderController);

router.post('/', userAuthProtect, (req, res, next) => userOrderController.placeOrder(req, res, next));
router.post('/checkout/totals', userAuthProtect, (req, res, next) => userOrderController.calculateCheckoutTotals(req, res, next));
router.get('/', userAuthProtect, (req, res, next) => userOrderController.getOrders(req, res, next));
router.get('/:id', userAuthProtect, (req, res, next) => userOrderController.getOrderDetails(req, res, next));
router.post('/:id/cancel', userAuthProtect, (req, res, next) => userOrderController.requestCancellation(req, res, next));
router.post('/:id/cancel-item/:productId', userAuthProtect, (req, res, next) => userOrderController.requestItemCancellation(req, res, next));
router.post('/:id/return', userAuthProtect, (req, res, next) => userOrderController.requestReturn(req, res, next));
router.post('/:id/return-item/:productId', userAuthProtect, (req, res, next) => userOrderController.requestItemReturn(req, res, next));
router.get('/shipping-charge/:state', userAuthProtect, (req, res, next) => userOrderController.getShippingCharge(req, res, next));
router.post('/verify-payment', userAuthProtect, (req, res, next) => userOrderController.verifyPayment(req, res, next));
router.post('/payment/webhook', (req, res, next) => userOrderController.handleRazorpayWebhook(req, res, next));

export default router;
