import { Router } from 'express';
import { getCart, toggleCartItem, updateCartItemQuantity, removeCartItem, syncOfflineCart } from '../../controllers/CartController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();

router.use(userAuthProtect);

router.get('/', getCart);
router.post('/toggle', toggleCartItem);
router.put('/update', updateCartItemQuantity);
router.delete('/:productId', removeCartItem);
router.post('/sync', syncOfflineCart);

export default router;
