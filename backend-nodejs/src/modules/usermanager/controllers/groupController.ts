import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { groupService } from '../services/groupService';

// 1. POST /groups - Create a new group / department
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    logger.warn({ ip: req.ip }, 'Group creation failed: Missing group name');
    throw new AppError('Group name is required', 400);
  }

  const group = await groupService.createGroup({ name, description });
  return res.status(201).json(group);
});

// 2. GET /groups - List groups with search and cursor pagination
export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const { search, cursor, page_size } = req.query;
  const pageSize = page_size ? parseInt(page_size as string, 10) : undefined;

  const response = await groupService.getGroups({
    search: search as string | undefined,
    cursor: cursor as string | undefined,
    pageSize,
  });

  return res.status(200).json(response);
});

// 3. GET /groups/:id - Get single group by ID
export const getGroupDetails = asyncHandler(async (req: Request, res: Response) => {
  const group = await groupService.getGroupById(req.params.id);
  return res.status(200).json(group);
});

// 4. PATCH /groups/:id - Partial update of group
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const updatedGroup = await groupService.updateGroup(req.params.id, req.body);
  return res.status(200).json(updatedGroup);
});

// 5. GET /groups/:id/roles - Get all roles within a group
export const getGroupRoles = asyncHandler(async (req: Request, res: Response) => {
  const roles = await groupService.getGroupRoles(req.params.id);
  return res.status(200).json(roles);
});
