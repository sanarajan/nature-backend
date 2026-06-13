import express from 'express';
import { InfluencerController } from '../../controllers/InfluencerController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();

router.use(userAuthProtect);

router.get('/dashboard', InfluencerController.getDashboardData);
router.post('/withdraw', InfluencerController.requestWithdrawal);
router.post('/upgrade', InfluencerController.upgradeToInfluencer);

export default router;
