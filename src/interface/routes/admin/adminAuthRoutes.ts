import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AuthController } from '../../controllers/AuthController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const authController = container.resolve(AuthController);

router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.get('/me', adminAuthProtect, (req, res) => authController.getMe(req, res));
router.put('/update-profile', adminAuthProtect, (req, res) => authController.updateProfile(req, res));

export default router;
