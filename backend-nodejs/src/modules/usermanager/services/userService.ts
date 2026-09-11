import { FilterQuery } from 'mongoose';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { Group } from '../models/Group';
import { Role, IRole } from '../models/Role';
import { IPermission } from '../models/Permission';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { CursorPaginationResponse } from '../../../common/types/pagination';
import { DropdownOption } from '../../../common/types/dropdown';

type PopulatedRole = Omit<IRole, 'permissions'> & { permissions: IPermission[] };

export class UserService {
  // 1. Create a new user with generated temporary password
  async createUser(data: {
    email: string;
    fullName: string;
    groupId: string;
    roleId: string;
    reportsToId?: string;
    languages?: string[];
  }): Promise<IUser> {
    const { email, fullName, groupId, roleId, reportsToId, languages } = data;

    if (!email || !fullName || !groupId || !roleId) {
      logger.warn({ email, fullName, groupId, roleId }, 'User creation failed: Missing required fields');
      throw new AppError('Email, fullName, groupId, and roleId are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      logger.warn({ email: normalizedEmail }, 'User creation failed: Email already exists');
      throw new AppError(`User with email '${email}' already exists`, 409);
    }

    const [group, role] = await Promise.all([
      Group.findById(groupId),
      Role.findById(roleId),
    ]);

    if (!group) {
      logger.warn({ groupId }, 'User creation failed: Specified group not found');
      throw new AppError('Specified group does not exist', 404);
    }

    if (!role) {
      logger.warn({ roleId }, 'User creation failed: Specified role not found');
      throw new AppError('Specified role does not exist', 404);
    }

    const defaultPassword = crypto.randomBytes(6).toString('hex') + 'A1!';

    const user = await User.create({
      email: normalizedEmail,
      password: defaultPassword,
      fullName: fullName.trim(),
      group: groupId,
      role: roleId,
      reportsTo: reportsToId || null,
      languages: languages || ['English'],
    });

    logger.info({ userId: user._id, email: user.email }, 'User created successfully');
    return user;
  }

  // 2. Get paginated users with populated relations
  async getUsers(params: {
    search?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<CursorPaginationResponse<IUser>> {
    const limit = Math.min(params.pageSize || 50, 1500);
    const filter: FilterQuery<IUser> = {};

    if (params.search) {
      filter.$or = [
        { fullName: { $regex: String(params.search), $options: 'i' } },
        { email: { $regex: String(params.search), $options: 'i' } },
      ];
    }

    if (params.cursor) {
      filter._id = { $gt: params.cursor };
    }

    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .populate('group', 'name')
        .populate('role', 'name')
        .populate('reportsTo', 'fullName email')
        .sort({ _id: 1 })
        .limit(limit + 1),
      User.countDocuments(params.search ? filter : {}),
    ]);

    const hasNextPage = users.length > limit;
    const results = hasNextPage ? users.slice(0, limit) : users;
    const nextCursor = hasNextPage ? results[results.length - 1]._id.toString() : null;

    return {
      results,
      next: nextCursor,
      previous: null,
      pageNumber: null,
      totalPages: null,
      totalSize: totalCount,
    };
  }

  // 3. Get user profile and resolved permissions for authenticated user
  async getAuthenticatedUserProfile(userId: string): Promise<{
    id: any;
    email: string;
    fullName: string;
    group: any;
    role: any;
    reportsTo: any;
    languages: string[];
    permissions: string[];
  }> {
    const user = await User.findById(userId)
      .populate('group', 'name')
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .populate('reportsTo', 'fullName email');

    if (!user) {
      logger.warn({ userId }, 'Authenticated user lookup failed: User not found in DB');
      throw new AppError('User not found', 404);
    }

    const role = user.role as unknown as PopulatedRole;
    const permissions = role?.permissions?.map((p) => p.codename) || [];

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      group: user.group,
      role: user.role,
      reportsTo: user.reportsTo,
      languages: user.languages,
      permissions,
    };
  }

  // 4. Get single user by ID
  async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id)
      .populate('group', 'name')
      .populate('role', 'name')
      .populate('reportsTo', 'fullName email');

    if (!user) {
      logger.warn({ userId: id }, 'User lookup failed: User not found');
      throw new AppError('User not found', 404);
    }

    return user;
  }

  // 5. Update user partial details
  async updateUser(
    id: string,
    data: {
      fullName?: string;
      groupId?: string;
      roleId?: string;
      reportsToId?: string;
      languages?: string[];
    }
  ): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      logger.warn({ userId: id }, 'User update failed: User not found');
      throw new AppError('User not found', 404);
    }

    if (data.fullName !== undefined) user.fullName = data.fullName.trim();
    if (data.groupId !== undefined) user.group = data.groupId as any;
    if (data.roleId !== undefined) user.role = data.roleId as any;
    if (data.reportsToId !== undefined) user.reportsTo = (data.reportsToId || null) as any;
    if (data.languages !== undefined) user.languages = data.languages;

    const updatedUser = await user.save();
    logger.info({ userId: updatedUser._id, email: updatedUser.email }, 'User updated successfully');
    return updatedUser;
  }

  // 6. Get users dropdown, optionally filtered by group and excluding a user ID
  async getUsersDropdown(groupId?: string, excludeUserId?: string): Promise<DropdownOption<string>[]> {
    if (!groupId) {
      return [];
    }

    const filter: FilterQuery<IUser> = { group: groupId };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    const users = await User.find(filter).select('fullName email _id').sort({ fullName: 1 });
    return users.map((u) => ({
      display_name: `${u.fullName} (${u.email})`,
      value: u._id.toString(),
    }));
  }
}

export const userService = new UserService();
