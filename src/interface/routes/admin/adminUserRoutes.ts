import { Router } from 'express';
import { adminAuthProtect } from '../../../middleware/adminAuthMiddleware';
import { getAllCustomers, updateCustomerStatus, deleteCustomer } from '../../controllers/AdminUserController';

const router = Router();

router.get('/', adminAuthProtect, getAllCustomers);
router.patch('/:id/status', adminAuthProtect, updateCustomerStatus);
router.delete('/:id', adminAuthProtect, deleteCustomer);

export default router;
