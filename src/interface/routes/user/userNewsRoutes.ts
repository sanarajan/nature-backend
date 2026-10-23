import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { UserNewsController } from '../../controllers/UserNewsController';

const router = Router();
const userNewsController = container.resolve(UserNewsController);

router.get('/', (req, res, next) => userNewsController.getActiveNews(req, res, next));

export default router;
