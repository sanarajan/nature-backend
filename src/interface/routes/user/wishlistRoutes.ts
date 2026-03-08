import { Router } from 'express';
import { toggleWishlist, getWishlist, syncWishlist } from '../../controllers/WishlistController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();

router.use(userAuthProtect);

router.post('/toggle', toggleWishlist);
router.post('/sync', syncWishlist);
router.get('/', getWishlist);

export default router;
