import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AuthController } from '../../controllers/AuthController';
import { UserController } from '../../controllers/user/UserController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();
const authController = container.resolve(AuthController);
const userController = container.resolve(UserController);

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

router.get('/me', userAuthProtect, (req, res) => userController.getMe(req, res));
router.put('/profile', userAuthProtect, (req, res) => userController.updateProfile(req, res));
router.get('/address', userAuthProtect, (req, res) => userController.getUserAddresses(req, res));
router.post('/address', userAuthProtect, (req, res) => userController.addOrUpdateAddress(req, res));
router.get('/states', userAuthProtect, (req, res) => userController.getStates(req, res));

export default router;
