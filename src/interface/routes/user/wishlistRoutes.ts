import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { WishlistController } from '../../controllers/WishlistController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();
const wishlistController = container.resolve(WishlistController);

router.use(userAuthProtect);

router.post('/toggle', (req, res) => wishlistController.toggleWishlist(req, res));
router.post('/sync', (req, res) => wishlistController.syncWishlist(req, res));
router.get('/', (req, res) => wishlistController.getWishlist(req, res));

export default router;
