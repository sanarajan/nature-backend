import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminSpinWheelController } from '../../controllers/AdminSpinWheelController';

const router = express.Router();
const adminSpinWheelController = container.resolve(AdminSpinWheelController);

router.get('/settings', adminAuthProtect, (req, res) => adminSpinWheelController.getSettings(req, res));
router.put('/settings', adminAuthProtect, (req, res) => adminSpinWheelController.updateSettings(req, res));

router.get('/segments', adminAuthProtect, (req, res) => adminSpinWheelController.getSegments(req, res));
router.post('/segments', adminAuthProtect, (req, res) => adminSpinWheelController.createSegment(req, res));
router.put('/segments/reorder', adminAuthProtect, (req, res) => adminSpinWheelController.reorderSegments(req, res));
router.put('/segments/:id', adminAuthProtect, (req, res) => adminSpinWheelController.updateSegment(req, res));
router.delete('/segments/:id', adminAuthProtect, (req, res) => adminSpinWheelController.deleteSegment(req, res));

router.get('/reports', adminAuthProtect, (req, res) => adminSpinWheelController.getReportStats(req, res));

export default router;
