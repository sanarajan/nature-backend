"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const ErrorMessages_1 = require("../constants/messages/ErrorMessages");
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || ErrorMessages_1.ErrorMessages.INTERNAL_SERVER_ERROR,
    });
};
exports.errorHandler = errorHandler;
