import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { InfluencerController } from '../../controllers/InfluencerController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const influencerController = container.resolve(InfluencerController);

router.get('/settings/public', (req, res) => influencerController.getPublicSettings(req, res));

router.use(userAuthProtect);

router.get('/dashboard', (req, res) => influencerController.getDashboardData(req, res));
router.post('/withdraw', (req, res) => influencerController.requestWithdrawal(req, res));
router.post('/upgrade', (req, res) => influencerController.upgradeToInfluencer(req, res));

export default router;
