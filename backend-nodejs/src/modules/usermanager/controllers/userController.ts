import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { userService } from '../services/userService';

// 1. POST /users - Creates a user with generated temporary password
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  return res.status(201).json(user);
});

// 2. GET /users - Returns a list of users with cursor pagination
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, cursor, page_size } = req.query;
  const pageSize = page_size ? parseInt(page_size as string, 10) : undefined;

  const response = await userService.getUsers({
    search: search as string | undefined,
    cursor: cursor as string | undefined,
    pageSize,
  });

  return res.status(200).json(response);
});

// 3. GET /users/me - Returns the current user details with permissions
export const getAuthenticatedUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    logger.warn({ ip: req.ip }, 'Unauthorized: User not authenticated');
    throw new AppError('Unauthorized: User not authenticated', 401);
  }

  const profile = await userService.getAuthenticatedUserProfile(req.user._id.toString());
  return res.status(200).json(profile);
});

// 4. GET /users/:id - Get user by ID
export const getUserDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  return res.status(200).json(user);
});

// 5. PATCH /users/:id - Updates user details of given userId
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id, req.body);
  return res.status(200).json(user);
});