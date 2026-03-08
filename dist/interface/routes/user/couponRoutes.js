"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CouponController_1 = require("../../controllers/CouponController");
const userAuthMiddleware_1 = require("../../../middleware/userAuthMiddleware");
const router = express_1.default.Router();
const couponController = new CouponController_1.CouponController();
router.get('/active', userAuthMiddleware_1.userAuthProtect, (req, res) => couponController.getActiveCoupons(req, res));
router.post('/validate', userAuthMiddleware_1.userAuthProtect, (req, res) => couponController.validateCoupon(req, res));
exports.default = router;
