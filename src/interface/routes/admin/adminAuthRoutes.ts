import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AuthController } from '../../controllers/AuthController';
import { UserController } from '../../controllers/user/UserController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const authController = container.resolve(AuthController);
const userController = container.resolve(UserController);

router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.get('/me', adminAuthProtect, (req, res) => userController.getMe(req, res));
router.put('/update-profile', adminAuthProtect, (req, res) => userController.updateProfile(req, res));

export default router;
