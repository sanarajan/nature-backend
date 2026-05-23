import { Router } from 'express';
import { getFeaturedProducts, getPopularProducts, getFilteredProducts, getProductById, getComboOffers, getOfferProducts } from '../../controllers/ProductController';

const router = Router();

router.get('/', getFilteredProducts);
router.get('/featured', getFeaturedProducts);
router.get('/popular', getPopularProducts);
router.get('/combo-offers', getComboOffers);
router.get('/offer-products', getOfferProducts);
router.get('/:id', getProductById);

export default router;
