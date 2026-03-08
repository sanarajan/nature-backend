"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuthMiddleware_1 = require("../../../middleware/adminAuthMiddleware");
const AdminCouponController_1 = require("../../controllers/AdminCouponController");
const router = express_1.default.Router();
router.get('/', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.getAllCoupons);
router.post('/add', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.addCoupon);
router.get('/:id', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.getCouponById);
router.put('/:id', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.updateCoupon);
router.delete('/:id', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.deleteCoupon);
router.patch('/:id/toggle-status', adminAuthMiddleware_1.adminAuthProtect, AdminCouponController_1.toggleCouponStatus);
exports.default = router;
