import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminSponsorController } from '../../controllers/AdminSponsorController';

const router = Router();
const adminSponsorController = container.resolve(AdminSponsorController);

router.get('/', adminAuthProtect, (req, res, next) => adminSponsorController.getAllSponsors(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => adminSponsorController.getSponsorById(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminSponsorController.addSponsor(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminSponsorController.editSponsor(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminSponsorController.deleteSponsor(req, res, next));
router.patch('/:id/toggle-status', adminAuthProtect, (req, res, next) => adminSponsorController.toggleSponsorStatus(req, res, next));
router.patch('/:id/status', adminAuthProtect, (req, res, next) => adminSponsorController.toggleSponsorStatus(req, res, next));

export default router;
