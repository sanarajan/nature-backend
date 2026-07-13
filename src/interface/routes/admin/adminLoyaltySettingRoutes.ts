import express from 'express';
import { AdminLoyaltySettingController } from '../../controllers/AdminLoyaltySettingController';
import { AdminLoyaltySettingUseCases } from '../../../application/usecases/admin/AdminLoyaltySettingUseCases';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = express.Router();

const adminLoyaltySettingUseCases = new AdminLoyaltySettingUseCases();
const adminLoyaltySettingController = new AdminLoyaltySettingController(adminLoyaltySettingUseCases);

router.get('/', adminAuthProtect, adminLoyaltySettingController.getSettings.bind(adminLoyaltySettingController));
router.put('/', adminAuthProtect, adminLoyaltySettingController.updateSettings.bind(adminLoyaltySettingController));

export default router;
