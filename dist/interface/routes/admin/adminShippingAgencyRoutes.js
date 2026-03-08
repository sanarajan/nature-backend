"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ShippingAgencyController_1 = require("../../controllers/ShippingAgencyController");
const router = express_1.default.Router();
router.post('/', ShippingAgencyController_1.addShippingAgency);
router.get('/', ShippingAgencyController_1.getAllShippingAgencies);
router.put('/:id', ShippingAgencyController_1.updateShippingAgency);
router.delete('/:id', ShippingAgencyController_1.deleteShippingAgency);
exports.default = router;
