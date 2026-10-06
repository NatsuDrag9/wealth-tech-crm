import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, requirePermission } from '../../src/common/middleware/authMiddleware';
import { generateAccessToken } from '../../src/common/utils/jwt';
import { User } from '../../src/modules/usermanager/models/User';
import { AppError } from '../../src/common/utils/AppError';

describe('Auth Middleware (Bearer Authentication & RBAC)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.restoreAllMocks();

    req = {
      headers: {},
      path: '/test',
      ip: '127.0.0.1',
    };
    res = {};
    next = vi.fn();
  });

  describe('authenticate', () => {
    it('should fail with 401 when Authorization header is missing', async () => {
      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication token is required');
    });

    it('should fail with 401 when Authorization header does not start with Bearer', async () => {
      req.headers = { authorization: 'Basic dXNlcjpwYXNz' };

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication token is required');
    });

    it('should fail with 401 when token is valid but user does not exist in DB', async () => {
      const token = generateAccessToken('deleted@wealthtech.com');
      req.headers = { authorization: `Bearer ${token}` };

      const mockQuery = {
        populate: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('User belonging to this token does not exist');
    });

    it('should succeed, attach user & permissions to req.user, and call next()', async () => {
      const email = 'active.rm@wealthtech.com';
      const token = generateAccessToken(email);
      req.headers = { authorization: `Bearer ${token}` };

      const mockUser = {
        _id: 'user_active_123',
        email,
        role: {
          name: 'ADVISOR',
          permissions: [{ codename: 'client:read' }, { codename: 'client:create' }],
        },
      };

      const mockQuery = {
        populate: vi.fn().mockResolvedValue(mockUser),
      };
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery as any);

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user?.email).toBe(email);
      expect(req.user?.permissions).toEqual(['client:read', 'client:create']);
    });
  });

  describe('requirePermission', () => {
    it('should fail with 401 if req.user is undefined', () => {
      req.user = undefined;
      const guard = requirePermission('client:create');

      expect(() => guard(req as Request, res as Response, next)).toThrow(
        new AppError('Unauthorized: User not authenticated', 401)
      );
    });

    it('should fail with 403 Forbidden if user lacks required permission', () => {
      req.user = {
        _id: 'user_123',
        email: 'limited@wealthtech.com',
        permissions: ['client:read'],
      } as any;

      const guard = requirePermission('client:create', 'client:delete');

      expect(() => guard(req as Request, res as Response, next)).toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should call next() if user possesses at least one of the required permissions', () => {
      req.user = {
        _id: 'user_123',
        email: 'rm@wealthtech.com',
        permissions: ['client:create'],
      } as any;

      const guard = requirePermission('client:read', 'client:create');
      guard(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
