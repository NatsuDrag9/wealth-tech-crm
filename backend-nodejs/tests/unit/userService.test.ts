import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { UserService } from '../../src/modules/usermanager/services/userService';
import { User } from '../../src/modules/usermanager/models/User';
import { Group } from '../../src/modules/usermanager/models/Group';
import { Role } from '../../src/modules/usermanager/models/Role';
import { AppError } from '../../src/common/utils/AppError';

describe('User Manager Service (RBAC & User Lifecycle)', () => {
  let service: UserService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new UserService();
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'new.advisor@wealthtech.com',
      fullName: 'Sunil Gavaskar',
      groupId: new Types.ObjectId().toString(),
      roleId: new Types.ObjectId().toString(),
    };

    it('should throw 400 if required fields are missing', async () => {
      await expect(
        service.createUser({ email: '', fullName: '', groupId: '', roleId: '' })
      ).rejects.toThrow(new AppError('Email, fullName, groupId, and roleId are required', 400));
    });

    it('should throw 409 Conflict if user email already exists', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue({ _id: new Types.ObjectId() } as any);

      await expect(service.createUser(validUserData)).rejects.toThrow(
        new AppError(`User with email '${validUserData.email}' already exists`, 409)
      );
    });

    it('should throw 404 if assigned group does not exist', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(Group, 'findById').mockResolvedValue(null);
      vi.spyOn(Role, 'findById').mockResolvedValue({ _id: new Types.ObjectId() } as any);

      await expect(service.createUser(validUserData)).rejects.toThrow(
        new AppError('Specified group does not exist', 404)
      );
    });

    it('should throw 404 if assigned role does not exist', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(Group, 'findById').mockResolvedValue({ _id: new Types.ObjectId() } as any);
      vi.spyOn(Role, 'findById').mockResolvedValue(null);

      await expect(service.createUser(validUserData)).rejects.toThrow(
        new AppError('Specified role does not exist', 404)
      );
    });

    it('should succeed and provision user with auto-generated secure password', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(Group, 'findById').mockResolvedValue({ _id: new Types.ObjectId(validUserData.groupId) } as any);
      vi.spyOn(Role, 'findById').mockResolvedValue({ _id: new Types.ObjectId(validUserData.roleId) } as any);

      const mockCreatedUser = {
        _id: new Types.ObjectId(),
        email: validUserData.email,
        fullName: validUserData.fullName,
        group: validUserData.groupId,
        role: validUserData.roleId,
        languages: ['English'],
      };
      vi.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);

      const created = await service.createUser(validUserData);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validUserData.email,
          fullName: validUserData.fullName,
          password: expect.any(String),
          languages: ['English'],
        })
      );
      expect(created.email).toBe(validUserData.email);
    });
  });

  describe('getAuthenticatedUserProfile', () => {
    it('should throw 404 if user is not found', async () => {
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
      };
      mockQuery.populate = vi.fn().mockImplementation(function () {
        return {
          populate: vi.fn().mockImplementation(function () {
            return {
              populate: vi.fn().mockResolvedValue(null),
            };
          }),
        };
      });
      vi.spyOn(User, 'findById').mockReturnValue(mockQuery as any);

      await expect(service.getAuthenticatedUserProfile('nonexistent_id')).rejects.toThrow(
        new AppError('User not found', 404)
      );
    });
  });
});
