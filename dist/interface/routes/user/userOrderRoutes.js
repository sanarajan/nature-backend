"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserOrderController_1 = require("../../controllers/UserOrderController");
const userAuthMiddleware_1 = require("../../../middleware/userAuthMiddleware");
const router = express_1.default.Router();
const userOrderController = new UserOrderController_1.UserOrderController();
router.post('/', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.placeOrder(req, res));
router.get('/', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.getOrders(req, res));
router.get('/:id', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.getOrderDetails(req, res));
router.post('/:id/cancel', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.requestCancellation(req, res));
router.post('/:id/cancel-item/:productId', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.requestItemCancellation(req, res));
router.post('/:id/return', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.requestReturn(req, res));
router.post('/:id/return-item/:productId', userAuthMiddleware_1.userAuthProtect, (req, res) => userOrderController.requestItemReturn(req, res));
exports.default = router;
