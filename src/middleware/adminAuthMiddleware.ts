import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IAuthService } from '../application/interfaces/auth/IAuthService';

export const adminAuthProtect = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let token;
    // Check cookies first (as per my previous implementation) or headers
    if (req.cookies && req.cookies.admin_jwt) {
        token = req.cookies.admin_jwt;
    } else {
        const authHeader = req.headers['authorization'];
        token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Access token missing' });
        return;
    }

    const authService = container.resolve<IAuthService>('IAuthService');
    try {
        const payload = await authService.verifyAccessToken(token);

        // Explicit Role Check
        const payloadRole = payload.role.toUpperCase();
        if (payloadRole !== 'ADMIN' && payloadRole !== 'STAFF') {
            res.status(403).json({ success: false, message: 'Forbidden: Admin or Staff access required' });
            return;
        }

        // Explicit Role Header Check
        const roleHeader = req.headers['role'] as string;
        if (roleHeader) {
            const rh = roleHeader.toLowerCase();
            if (rh !== 'admin' && rh !== 'staff') {
                res.status(403).json({ success: false, message: 'Unauthorized: Role mismatch' });
                return;
            }
        }

        (req as any).user = payload;
        next();
    } catch (err: any) {
        console.error('Admin access token verification failed:', err.message);
        res.status(401).json({ success: false, message: 'Access token invalid or expired' });
    }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user && user.role && user.role.toUpperCase() === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }
};

