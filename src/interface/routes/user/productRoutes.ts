import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { ProductController } from '../../controllers/ProductController';

const router = Router();
const controller = container.resolve(ProductController);

router.get('/', (req, res, next) => controller.getFilteredProducts(req, res, next));
router.get('/featured', (req, res, next) => controller.getFeaturedProducts(req, res, next));
router.get('/popular', (req, res, next) => controller.getPopularProducts(req, res, next));
router.get('/combo-offers', (req, res, next) => controller.getComboOffers(req, res, next));
router.get('/offer-products', (req, res, next) => controller.getOfferProducts(req, res, next));
router.get('/:id', (req, res, next) => controller.getProductById(req, res, next));

export default router;
