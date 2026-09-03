import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { UserCertificationController } from '../../controllers/UserCertificationController';

const router = Router();
const userCertificationController = container.resolve(UserCertificationController);

router.get('/', (req, res, next) => userCertificationController.getAllCertifications(req, res, next));

export default router;
