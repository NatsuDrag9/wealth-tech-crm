import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { login, refresh, logout } from '../../src/modules/auth/controllers/authController';
import { User } from '../../src/modules/usermanager/models/User';
import { AppError } from '../../src/common/utils/AppError';
import { generateRefreshToken } from '../../src/common/utils/jwt';

describe('Auth Controller (Complete Flow)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.restoreAllMocks();

    req = {
      body: {},
      cookies: {},
      headers: {},
      ip: '127.0.0.1',
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  const callHandler = async (handler: any) => {
    handler(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  describe('POST /auth/login', () => {
    it('should fail with 400 when email or password is missing', async () => {
      req.body = { email: 'test@wealthtech.com' }; // missing password

      await callHandler(login);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Email and password are required');
    });

    it('should fail with 401 when user is not found in database', async () => {
      req.body = { email: 'notfound@wealthtech.com', password: 'Password123' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await callHandler(login);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid email or password');
    });

    it('should fail with 401 when password hash does not match', async () => {
      req.body = { email: 'advisor@wealthtech.com', password: 'WrongPassword' };

      const mockUser = {
        _id: 'user_123',
        email: 'advisor@wealthtech.com',
        password: '$2a$10$hashedpassword',
        comparePassword: vi.fn().mockResolvedValue(false),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockUser),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await callHandler(login);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid email or password');
    });

    it('should succeed with 200, return accessToken, and set HttpOnly refreshToken cookie', async () => {
      req.body = { email: 'advisor@wealthtech.com', password: 'ValidPassword123' };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'advisor@wealthtech.com',
        fullName: 'Rohit Sharma',
        password: '$2a$10$hashedpassword',
        comparePassword: vi.fn().mockResolvedValue(true),
        role: {
          name: 'ADVISOR',
          permissions: [
            { codename: 'client:read' },
            { codename: 'client:create' },
          ],
        },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockUser),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await callHandler(login);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: 'Bearer',
          role: 'ADVISOR',
          permissions: ['client:read', 'client:create'],
          user: expect.objectContaining({
            email: 'advisor@wealthtech.com',
            fullName: 'Rohit Sharma',
          }),
        })
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('should fail with 401 when refreshToken cookie is missing', async () => {
      req.cookies = {}; // No refreshToken cookie

      await callHandler(refresh);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Refresh token is required');
    });

    it('should fail with 401 when refreshToken is invalid or tampered', async () => {
      req.cookies = { refreshToken: 'invalid.tampered.token' };

      await callHandler(refresh);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail with 401 when the user in the valid token no longer exists in DB', async () => {
      const validRefreshToken = generateRefreshToken('deleted.user@wealthtech.com');
      req.cookies = { refreshToken: validRefreshToken };

      const mockQuery = {
        populate: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await callHandler(refresh);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('User belonging to this token no longer exists');
    });

    it('should succeed with 200 and return a fresh access token with updated permissions', async () => {
      const validRefreshToken = generateRefreshToken('active.user@wealthtech.com');
      req.cookies = { refreshToken: validRefreshToken };

      const mockUser = {
        _id: '507f1f77bcf86cd799439022',
        email: 'active.user@wealthtech.com',
        role: {
          name: 'ADVISOR',
          permissions: [{ codename: 'portfolio:review' }],
        },
      };

      const mockQuery = {
        populate: vi.fn().mockResolvedValue(mockUser),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await callHandler(refresh);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: 'Bearer',
          permissions: ['portfolio:review'],
        })
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear the refreshToken cookie and return 200', async () => {
      await callHandler(logout);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});
