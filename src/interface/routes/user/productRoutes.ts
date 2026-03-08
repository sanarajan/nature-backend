import { Router } from 'express';
import { getFeaturedProducts, getPopularProducts, getFilteredProducts } from '../../controllers/ProductController';

const router = Router();

router.get('/', getFilteredProducts);
router.get('/featured', getFeaturedProducts);
router.get('/popular', getPopularProducts);

export default router;
