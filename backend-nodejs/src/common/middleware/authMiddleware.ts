import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';
import { User, IUser } from '../../modules/usermanager/models/User';
import { IRole } from '../../modules/usermanager/models/Role';
import { IPermission } from '../../modules/usermanager/models/Permission';
import { logger } from '../utils/logger';

// Helper type representing Role after permissions are populated
type PopulatedRole = Omit<IRole, 'permissions'> & { permissions: IPermission[] };

declare global {
    namespace Express {
        interface Request {
            user?: IUser & { permissions: string[] };
        }
    }
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn({ path: req.path, ip: req.ip }, 'Authentication failed: missing or invalid token');
            throw new AppError('Authentication token is required', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Fetch user from MongoDB to attach populated role and permissions
        const user = await User.findOne({ email: decoded.email }).populate({
            path: 'role',
            populate: { path: 'permissions' },
        });

        if (!user) {
            logger.warn({ path: req.path, ip: req.ip }, 'Authentication failed: user unavailable');
            throw new AppError('User belonging to this token does not exist', 401);
        }

        // Flatten role's permissions into an array of string codenames
        const role = user.role as unknown as PopulatedRole;
        const permissions: string[] = role?.permissions?.map((p) => p.codename) || [];

        // Attach authenticated user and permissions to req.user
        req.user = Object.assign(user, { permissions });


        next();
    } catch (error) {
        next(error);
    }
};

export const requirePermission = (...requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            logger.warn({ path: req.path, ip: req.ip }, 'Authorization denied: User not authenticated');
            throw new AppError('Unauthorized: User not authenticated', 401);
        }

        const hasPermission = requiredPermissions.some((perm) => req.user?.permissions.includes(perm));

        if (!hasPermission) {
            logger.warn(
                { userId: req.user?._id, requiredPermissions, path: req.path },
                'Authorization denied: missing permission'
            );
            throw new AppError(
                `Forbidden: Missing required permission (requires one of: ${requiredPermissions.join(', ')})`,
                403
            );
        }

        next();
    };
};