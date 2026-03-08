"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tsyringe_1 = require("tsyringe");
const WalletController_1 = require("../../controllers/WalletController");
const userAuthMiddleware_1 = require("../../../middleware/userAuthMiddleware");
const router = express_1.default.Router();
const walletController = tsyringe_1.container.resolve(WalletController_1.WalletController);
router.get('/', userAuthMiddleware_1.userAuthProtect, (req, res) => walletController.getWallet(req, res));
exports.default = router;
