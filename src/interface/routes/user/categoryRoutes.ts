import { Router } from 'express';
import { getCategoriesWithCounts, getCategoryHierarchy } from '../../controllers/CategoryController';

const router = Router();

router.get('/', getCategoriesWithCounts);
router.get('/hierarchy', getCategoryHierarchy);

export default router;
