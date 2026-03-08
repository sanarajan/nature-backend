import express from 'express';
import { UserOrderController } from '../../controllers/UserOrderController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const userOrderController = new UserOrderController();

router.post('/', userAuthProtect, (req, res) => userOrderController.placeOrder(req, res));
router.get('/', userAuthProtect, (req, res) => userOrderController.getOrders(req, res));
router.get('/:id', userAuthProtect, (req, res) => userOrderController.getOrderDetails(req, res));
router.post('/:id/cancel', userAuthProtect, (req, res) => userOrderController.requestCancellation(req, res));
router.post('/:id/cancel-item/:productId', userAuthProtect, (req, res) => userOrderController.requestItemCancellation(req, res));
router.post('/:id/return', userAuthProtect, (req, res) => userOrderController.requestReturn(req, res));
router.post('/:id/return-item/:productId', userAuthProtect, (req, res) => userOrderController.requestItemReturn(req, res));
router.get('/shipping-charge/:state', userAuthProtect, (req, res) => userOrderController.getShippingCharge(req, res));
router.post('/verify-payment', userAuthProtect, (req, res) => userOrderController.verifyPayment(req, res));
router.post('/payment/webhook', (req, res) => userOrderController.handleRazorpayWebhook(req, res));


export default router;
