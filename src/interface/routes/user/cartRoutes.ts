import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { CartController } from '../../controllers/CartController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();
const cartController = container.resolve(CartController);

// Public calculation endpoint
router.post('/calculate', (req, res) => cartController.calculateCartTotals(req, res));

router.use(userAuthProtect);

router.get('/', (req, res) => cartController.getCart(req, res));
router.post('/toggle', (req, res) => cartController.toggleCartItem(req, res));
router.put('/update', (req, res) => cartController.updateCartItemQuantity(req, res));
router.delete('/:productId', (req, res) => cartController.removeCartItem(req, res));
router.post('/sync', (req, res) => cartController.syncOfflineCart(req, res));

export default router;
