import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AuthController } from '../../controllers/AuthController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = Router();
const authController = container.resolve(AuthController);

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.get('/me', userAuthProtect, (req, res) => authController.getMe(req, res));
router.put('/profile', userAuthProtect, (req, res) => authController.updateProfile(req, res));
router.get('/address', userAuthProtect, (req, res) => authController.getUserAddresses(req, res));
router.post('/address', userAuthProtect, (req, res) => authController.addOrUpdateAddress(req, res));
router.get('/states', userAuthProtect, (req, res) => authController.getStates(req, res));

export default router;
