"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthProtect = void 0;
const tsyringe_1 = require("tsyringe");
const adminAuthProtect = async (req, res, next) => {
    let token;
    // Check cookies first (as per my previous implementation) or headers
    if (req.cookies && req.cookies.admin_jwt) {
        token = req.cookies.admin_jwt;
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
        // Explicit Role Check
        if (payload.role.toUpperCase() !== 'ADMIN') {
            res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
            return;
        }
        // Explicit Role Header Check
        const roleHeader = req.headers['role'];
        if (roleHeader && roleHeader.toLowerCase() !== 'admin') {
            res.status(403).json({ success: false, message: 'Unauthorized: Role mismatch' });
            return;
        }
        req.user = payload;
        next();
    }
    catch (err) {
        console.error('Admin access token verification failed:', err.message);
        res.status(401).json({ success: false, message: 'Access token invalid or expired' });
    }
};
exports.adminAuthProtect = adminAuthProtect;
