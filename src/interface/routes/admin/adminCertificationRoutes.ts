import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminCertificationController } from '../../controllers/AdminCertificationController';

const router = Router();
const adminCertificationController = container.resolve(AdminCertificationController);

router.get('/', adminAuthProtect, (req, res, next) => adminCertificationController.getAllCertifications(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => adminCertificationController.getCertificationById(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminCertificationController.addCertification(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminCertificationController.editCertification(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminCertificationController.deleteCertification(req, res, next));

export default router;
