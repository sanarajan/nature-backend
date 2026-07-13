import { Router } from 'express';
import { UserLoyaltyController } from '../../controllers/UserLoyaltyController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();
const userLoyaltyController = new UserLoyaltyController();

router.get('/points', userAuthProtect, userLoyaltyController.getAvailablePoints.bind(userLoyaltyController));
router.post('/wheel', userAuthProtect, userLoyaltyController.spinWheel.bind(userLoyaltyController));

export default router;
