import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import crypto from 'crypto';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { Group } from '../models/Group';
import { IPermission } from '../models/Permission';
import { IRole, Role } from '../models/Role';
import { IUser, User } from '../models/User';
import { CursorPaginationResponse } from '../../../common/types/pagination';

type PopulatedRole = Omit<IRole, 'permissions'> & { permissions: IPermission[] };

// 1. POST /users - Creates a user with generated temporary password
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, fullName, groupId, roleId, reportsToId, languages } = req.body;

  // reportsToId is optional because top-level managers do not report to anyone
  if (!email || !fullName || !groupId || !roleId) {
    logger.warn({ ip: req.ip }, 'User creation failed: Missing required fields');
    throw new AppError('Email, fullName, groupId, and roleId are required', 400);
  }

  // Check unique email
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    logger.warn({ email: email.toLowerCase().trim(), ip: req.ip }, 'User creation failed: Email already exists');
    throw new AppError(`User with email '${email}' already exists`, 409);
  }

  // Verify group and role exist
  const [group, role] = await Promise.all([
    Group.findById(groupId),
    Role.findById(roleId),
  ]);

  if (!group) {
    logger.warn({ groupId, ip: req.ip }, 'User creation failed: Group not found');
    throw new AppError('Specified group does not exist', 404);
  }

  if (!role) {
    logger.warn({ roleId, ip: req.ip }, 'User creation failed: Role not found');
    throw new AppError('Specified role does not exist', 404);
  }

  // Generate a random temporary password (in production, emailed to the user)
  const defaultPassword = crypto.randomBytes(6).toString('hex') + 'A1!';

  const user = await User.create({
    email: email.toLowerCase().trim(),
    password: defaultPassword,
    fullName: fullName.trim(),
    group: groupId,
    role: roleId,
    reportsTo: reportsToId || null,
    languages: languages || ['English'],
  });

  logger.info({ userId: user._id, email: user.email }, 'User created successfully');
  return res.status(201).json(user);
});

// 2. GET /users - Returns a list of users with cursor pagination
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, cursor, page_size } = req.query;
  const limit = Math.min(parseInt(page_size as string, 10) || 50, 1500);

  const filter: FilterQuery<IUser> = {};

  if (search) {
    filter.$or = [
      { fullName: { $regex: String(search), $options: 'i' } },
      { email: { $regex: String(search), $options: 'i' } },
    ];
  }

  if (cursor) {
    filter._id = { $gt: cursor };
  }

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .populate('group', 'name')
      .populate('role', 'name')
      .populate('reportsTo', 'fullName email')
      .sort({ _id: 1 })
      .limit(limit + 1),
    User.countDocuments(search ? filter : {}),
  ]);

  const hasNextPage = users.length > limit;
  const results = hasNextPage ? users.slice(0, limit) : users;
  const nextCursor = hasNextPage ? results[results.length - 1]._id.toString() : null;

  const response: CursorPaginationResponse<IUser> = {
    results,
    next: nextCursor,
    previous: null,
    pageNumber: null,
    totalPages: null,
    totalSize: totalCount,
  };

  return res.status(200).json(response);
});

// 3. GET /users/me - Returns the current user details with permissions
export const getAuthenticatedUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    logger.warn({ ip: req.ip }, 'Unauthorized: User not authenticated');
    throw new AppError('Unauthorized: User not authenticated', 401);
  }

  const user = await User.findById(req.user._id)
    .populate('group', 'name')
    .populate({
      path: 'role',
      populate: { path: 'permissions' },
    })
    .populate('reportsTo', 'fullName email');

  if (!user) {
    logger.warn({ userId: req.user._id }, 'Authenticated user record not found in DB');
    throw new AppError('User not found', 404);
  }

  const role = user.role as unknown as PopulatedRole;
  const permissions = role?.permissions?.map((p) => p.codename) || [];

  return res.status(200).json({
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    group: user.group,
    role: user.role,
    reportsTo: user.reportsTo,
    languages: user.languages,
    permissions,
  });
});

// 4. GET /users/:id - Get user by ID
export const getUserDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id)
    .populate('group', 'name')
    .populate('role', 'name')
    .populate('reportsTo', 'fullName email');

  if (!user) {
    logger.warn({ userId: req.params.id, ip: req.ip }, 'User lookup failed: Not found');
    throw new AppError('User not found', 404);
  }

  return res.status(200).json(user);
});

// 5. PATCH /users/:id - Updates user details of given userId
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, groupId, roleId, reportsToId, languages } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    logger.warn({ userId: req.params.id, ip: req.ip }, 'User update failed: Not found');
    throw new AppError('User not found', 404);
  }

  if (fullName !== undefined) user.fullName = fullName.trim();
  if (groupId !== undefined) user.group = groupId;
  if (roleId !== undefined) user.role = roleId;
  if (reportsToId !== undefined) user.reportsTo = reportsToId || null;
  if (languages !== undefined) user.languages = languages;

  await user.save();

  logger.info({ userId: user._id, email: user.email }, 'User updated successfully');
  return res.status(200).json(user);
});