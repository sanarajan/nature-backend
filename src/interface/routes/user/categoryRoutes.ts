import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { CategoryController } from '../../controllers/CategoryController';

const router = Router();
const categoryController = container.resolve(CategoryController);

router.get('/', (req, res, next) => categoryController.getCategoriesWithCounts(req, res, next));
router.get('/hierarchy', (req, res, next) => categoryController.getCategoryHierarchy(req, res, next));

export default router;
