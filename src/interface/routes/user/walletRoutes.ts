import express from 'express';
import { container } from '../../../infrastructure/config/container';
import { WalletController } from '../../controllers/WalletController';
import { userAuthProtect } from '../../../middleware/userAuthMiddleware';

const router = express.Router();
const walletController = container.resolve(WalletController);

router.get('/', userAuthProtect, (req, res) => walletController.getWallet(req, res));

export default router;
