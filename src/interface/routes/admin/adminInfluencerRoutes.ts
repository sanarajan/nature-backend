import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminInfluencerController } from '../../controllers/AdminInfluencerController';
import { AdminInfluencerSettingController } from '../../controllers/AdminInfluencerSettingController';
import { adminAuthProtect, adminOnly } from '../../../middleware/adminAuthMiddleware';

const router = express.Router();
const adminInfluencerController = container.resolve(AdminInfluencerController);
const adminInfluencerSettingController = container.resolve(AdminInfluencerSettingController);

// Apply auth middleware to all routes
router.use(adminAuthProtect);

router.get('/', (req, res) => adminInfluencerController.getAllInfluencers(req, res));
router.get('/settings', (req, res, next) => adminInfluencerSettingController.getSettings(req, res, next));
router.put('/settings', adminOnly, (req, res, next) => adminInfluencerSettingController.updateSettings(req, res, next));
router.get('/withdrawals', (req, res) => adminInfluencerController.getWithdrawalRequests(req, res));
router.get('/requests', (req, res) => adminInfluencerController.getRequests(req, res));
router.post('/requests/:id/approve', adminOnly, (req, res) => adminInfluencerController.approveRequest(req, res));
router.post('/requests/:id/reject', adminOnly, (req, res) => adminInfluencerController.rejectRequest(req, res));
router.get('/notifications', (req, res) => adminInfluencerController.getNotifications(req, res));
router.put('/notifications/:id/read', (req, res) => adminInfluencerController.markNotificationRead(req, res));
router.get('/products', (req, res) => adminInfluencerController.getProducts(req, res));
router.put('/products/:productId/discount', (req, res) => adminInfluencerController.updateProductDiscount(req, res));
router.get('/:id/stats', (req, res) => adminInfluencerController.getInfluencerStats(req, res));
router.put('/:id', adminOnly, (req, res) => adminInfluencerController.updateInfluencer(req, res));
router.put('/withdrawals/:id', adminOnly, (req, res) => adminInfluencerController.processWithdrawal(req, res));
router.post('/withdrawals/:id/approve', adminOnly, (req, res) => adminInfluencerController.approveWithdrawal(req, res));
router.post('/withdrawals/:id/reject', adminOnly, (req, res) => adminInfluencerController.rejectWithdrawal(req, res));
router.post('/withdrawals/:id/pay', adminOnly, (req, res) => adminInfluencerController.markWithdrawalPaid(req, res));

export default router;

