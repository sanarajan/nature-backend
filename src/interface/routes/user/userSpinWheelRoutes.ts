import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { UserSpinWheelController } from '../../controllers/UserSpinWheelController';
import { userAuthProtect, optionalUserAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const userSpinWheelController = container.resolve(UserSpinWheelController);

router.get('/status', optionalUserAuthProtect, (req, res) => userSpinWheelController.getStatus(req, res));
router.post('/spin', userAuthProtect, (req, res) => userSpinWheelController.spin(req, res));
router.get('/my-rewards', userAuthProtect, (req, res) => userSpinWheelController.getMyRewards(req, res));

export default router;
