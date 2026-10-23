import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { UserSponsorController } from '../../controllers/UserSponsorController';

const router = Router();
const userSponsorController = container.resolve(UserSponsorController);

router.get('/', (req, res, next) => userSponsorController.getActiveSponsors(req, res, next));

export default router;
