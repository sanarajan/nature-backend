import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { InfluencerController } from '../../controllers/InfluencerController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const influencerController = container.resolve(InfluencerController);

router.get('/settings/public', (req, res) => influencerController.getPublicSettings(req, res));
router.post('/track-visit', (req, res) => influencerController.trackVisit(req, res));

router.use(userAuthProtect);

router.get('/dashboard', (req, res) => influencerController.getDashboardData(req, res));
router.post('/withdraw', (req, res) => influencerController.requestWithdrawal(req, res));
router.put('/bank-details', (req, res) => influencerController.updateBankDetails(req, res));
router.get('/withdrawals', (req, res) => influencerController.getWithdrawalHistory(req, res));
router.get('/withdrawals/:id', (req, res) => influencerController.getWithdrawalDetails(req, res));
router.get('/notifications', (req, res) => influencerController.getUserNotifications(req, res));
router.post('/upgrade', (req, res) => influencerController.upgradeToInfluencer(req, res));

export default router;
