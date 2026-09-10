import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../../common/utils/jwt';
import { IPermission } from '../../usermanager/models/Permission';
import { IRole } from '../../usermanager/models/Role';
import { User } from '../../usermanager/models/User';
import { config } from '../../../config/environment';
import { logger } from '../../../common/utils/logger';

type PopulatedRole = Omit<IRole, 'permissions'> & { permissions: IPermission[] };

// POST /auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        logger.warn({ ip: req.ip }, 'Login validation failed: Missing email or password');
        throw new AppError('Email and password are required', 400);
    }

    // Find user and explicitly select password (since select: false in schema)
    const user = await User.findOne({
        email: email.toLowerCase(),
    })
        .select('+password')
        .populate({
            path: 'role',
            populate: { path: 'permissions' },
        });

    if (!user || !user.password) {
        logger.warn({ email: email.toLowerCase(), ip: req.ip }, 'Failed login attempt: user not found');
        throw new AppError('Invalid email or password', 401);
    }

    // Verify BCrypt password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        logger.warn({ email: email.toLowerCase(), ip: req.ip }, 'Failed login attempt: invalid credentials');
        throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.email);
    const refreshToken = generateRefreshToken(user.email);

    // Set refresh token in HttpOnly cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Extract resolved permission codenames
    const role = user.role as unknown as PopulatedRole;
    const permissions = role?.permissions?.map((p) => p.codename) || [];

    logger.info({ userId: user._id, email: user.email }, 'User logged in successfully');

    return res.status(200).json({
        accessToken,
        tokenType: 'Bearer',
        user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            group: user.group,
            role: user.role,
            permissions,
        },
    });
});

// POST /auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        logger.warn({ ip: req.ip }, 'Token refresh failed: Missing refreshToken cookie');
        throw new AppError('Refresh token is required', 401);
    }

    const decoded = verifyToken(refreshToken);

    // Verify user still exists
    const user = await User.findOne({ email: decoded.email }).populate({
        path: 'role',
        populate: { path: 'permissions' },
    });

    if (!user) {
        logger.warn({ email: decoded.email }, 'Token refresh failed: User no longer exists');
        throw new AppError('User belonging to this token no longer exists', 401);
    }

    // Issue fresh 15 min access token
    const newAccessToken = generateAccessToken(user.email);

    const role = user.role as unknown as PopulatedRole;
    const permissions = role?.permissions?.map((p) => p.codename) || [];

    logger.info({ email: decoded.email }, 'Access token refreshed successfully');

    return res.status(200).json({
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        permissions,
    });
});

// POST /auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
    });

    logger.info({ ip: req.ip }, 'User logged out successfully');

    return res.status(200).json({ message: 'Logged out successfully' });
});