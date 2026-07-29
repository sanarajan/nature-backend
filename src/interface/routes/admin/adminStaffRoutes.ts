import { Router, Request, Response, NextFunction } from 'express';
import { container } from '../../../infrastructure/config/container';
import { AdminStaffController } from '../../controllers/AdminStaffController';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';

const router = Router();
const controller = container.resolve(AdminStaffController);

const mainAdminOnly = (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user && (req as any).user.role && (req as any).user.role.toUpperCase() === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Forbidden: Main Admin access required' });
    }
};

router.use(adminAuthProtect);
router.use(mainAdminOnly);

router.post('/', (req, res) => controller.createStaff(req, res));
router.get('/', (req, res) => controller.getStaffList(req, res));
router.get('/:id', (req, res) => controller.getStaffDetails(req, res));
router.put('/:id', (req, res) => controller.updateStaff(req, res));
router.put('/:id/activate', (req, res) => controller.activateStaff(req, res));
router.put('/:id/deactivate', (req, res) => controller.deactivateStaff(req, res));
router.put('/:id/block', (req, res) => controller.blockStaff(req, res));
router.put('/:id/unblock', (req, res) => controller.unblockStaff(req, res));

export default router;
