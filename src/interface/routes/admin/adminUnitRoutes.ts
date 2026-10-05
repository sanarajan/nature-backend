import { Router } from 'express';
import { container } from '../../../infrastructure/config/container';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { AdminUnitController } from '../../controllers/AdminUnitController';

const router = Router();
const adminUnitController = container.resolve(AdminUnitController);

router.get('/', adminAuthProtect, (req, res, next) => adminUnitController.getAllUnits(req, res, next));
router.get('/:id', adminAuthProtect, (req, res, next) => adminUnitController.getUnitById(req, res, next));
router.post('/', adminAuthProtect, (req, res, next) => adminUnitController.addUnit(req, res, next));
router.put('/:id', adminAuthProtect, (req, res, next) => adminUnitController.updateUnit(req, res, next));
router.delete('/:id', adminAuthProtect, (req, res, next) => adminUnitController.deleteUnit(req, res, next));

export default router;
