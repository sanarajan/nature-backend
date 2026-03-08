"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuthProtect = void 0;
const tsyringe_1 = require("tsyringe");
const userAuthProtect = async (req, res, next) => {
    let token;
    if (req.cookies && req.cookies.user_jwt) {
        token = req.cookies.user_jwt;
    }
    else {
        const authHeader = req.headers['authorization'];
        token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    }
    if (!token) {
        res.status(401).json({ success: false, message: 'Access token missing' });
        return;
    }
    const authService = tsyringe_1.container.resolve('AuthService');
    try {
        const payload = await authService.verifyAccessToken(token);
        // Explicit Role Check from JWT Payload
        if (!payload.role || payload.role.toUpperCase() !== 'USER') {
            console.warn(`[AUTH] 403 Forbidden: User role check failed. Role in payload: ${payload.role}, UserID: ${payload.id}`);
            res.status(403).json({
                success: false,
                message: `Forbidden: User access required. Your role: ${payload.role || 'missing'}`,
            });
            return;
        }
        req.user = payload;
        next();
    }
    catch (err) {
        console.error('User access token verification failed:', err.message);
        res.status(401).json({ success: false, message: 'Access token invalid or expired' });
    }
};
exports.userAuthProtect = userAuthProtect;
