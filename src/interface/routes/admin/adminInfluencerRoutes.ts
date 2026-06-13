import express from 'express';
import { AdminInfluencerController } from '../../controllers/AdminInfluencerController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = express.Router();

// Apply auth middleware to all routes
router.use(adminAuthProtect);

router.get('/', AdminInfluencerController.getAllInfluencers);
router.get('/withdrawals', AdminInfluencerController.getWithdrawalRequests);
router.get('/:id/stats', AdminInfluencerController.getInfluencerStats);
router.put('/:id', AdminInfluencerController.updateInfluencer);
router.put('/withdrawals/:id', AdminInfluencerController.processWithdrawal);

export default router;
