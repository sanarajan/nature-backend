import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminInfluencerController } from '../../controllers/AdminInfluencerController';
import { AdminInfluencerSettingController } from '../../controllers/AdminInfluencerSettingController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = express.Router();
const adminInfluencerController = container.resolve(AdminInfluencerController);
const adminInfluencerSettingController = container.resolve(AdminInfluencerSettingController);

// Apply auth middleware to all routes
router.use(adminAuthProtect);

router.get('/', (req, res) => adminInfluencerController.getAllInfluencers(req, res));
router.get('/settings', (req, res, next) => adminInfluencerSettingController.getSettings(req, res, next));
router.put('/settings', (req, res, next) => adminInfluencerSettingController.updateSettings(req, res, next));
router.get('/withdrawals', (req, res) => adminInfluencerController.getWithdrawalRequests(req, res));
router.get('/:id/stats', (req, res) => adminInfluencerController.getInfluencerStats(req, res));
router.put('/:id', (req, res) => adminInfluencerController.updateInfluencer(req, res));
router.put('/withdrawals/:id', (req, res) => adminInfluencerController.processWithdrawal(req, res));

export default router;
