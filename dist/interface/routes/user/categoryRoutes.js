"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CategoryController_1 = require("../../controllers/CategoryController");
const router = (0, express_1.Router)();
router.get('/', CategoryController_1.getCategoriesWithCounts);
router.get('/hierarchy', CategoryController_1.getCategoryHierarchy);
exports.default = router;
