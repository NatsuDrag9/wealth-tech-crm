import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { Group, IGroup } from '../models/Group';
import { Role } from '../models/Role';
import { CursorPaginationResponse } from '../../../common/types/pagination';

// 1. POST /groups - Create a new group / department
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    logger.warn({ ip: req.ip }, 'Group creation failed: Missing group name');
    throw new AppError('Group name is required', 400);
  }

  // Check name uniqueness
  const existingGroup = await Group.findOne({ name: name.trim() });
  if (existingGroup) {
    logger.warn({ name: name.trim(), ip: req.ip }, 'Group creation failed: Duplicate group name');
    throw new AppError(`Group with name '${name}' already exists`, 409);
  }

  const group = await Group.create({
    name: name.trim(),
    description: description || '',
  });

  logger.info({ groupId: group._id, name: group.name }, 'Group created successfully');
  res.status(201).json(group);
});

// 2. GET /groups - List groups with search and pagination
export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const { search, cursor, page_size } = req.query;

  // Max page size cap (1500) to prevent memory exhaustion / DoS
  const limit = Math.min(parseInt(page_size as string, 10) || 50, 1500);

  const filter: FilterQuery<IGroup> = {};

  // Search by group name (case-insensitive)
  if (search) {
    filter.name = { $regex: String(search), $options: 'i' };
  }

  // Cursor-based seek: fetch records after the cursor ID
  if (cursor) {
    filter._id = { $gt: cursor };
  }

  // Execute data query and count query concurrently via Promise.all
  const [groups, totalCount] = await Promise.all([
    Group.find(filter).sort({ _id: 1 }).limit(limit + 1), // fetch limit + 1 to peek ahead for next page
    Group.countDocuments(search ? filter : {}),
  ]);

  const hasNextPage = groups.length > limit;
  const results = hasNextPage ? groups.slice(0, limit) : groups;
  const nextCursor = hasNextPage ? results[results.length - 1]._id.toString() : null;

  const response: CursorPaginationResponse<IGroup> = {
    results,
    next: nextCursor,
    previous: null,
    pageNumber: null,
    totalPages: null,
    totalSize: totalCount,
  };

  return res.status(200).json(response);
});

// 3. GET /groups/:id - Get single group by ID
export const getGroupDetails = asyncHandler(async (req: Request, res: Response) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    logger.warn({ groupId: req.params.id, ip: req.ip }, 'Group lookup failed: Group not found');
    throw new AppError('Group not found', 404);
  }

  return res.status(200).json(group);
});

// 4. PATCH /groups/:id - Partial update of group
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const group = await Group.findById(req.params.id);
  if (!group) {
    logger.warn({ groupId: req.params.id, ip: req.ip }, 'Group update failed: Group not found');
    throw new AppError('Group not found', 404);
  }

  // If renaming, ensure the new name does not conflict with another group
  if (name && name.trim() !== group.name) {
    const duplicate = await Group.findOne({
      name: name.trim(),
      _id: { $ne: group._id },
    });
    if (duplicate) {
      logger.warn({ name: name.trim(), groupId: group._id }, 'Group update failed: Duplicate group name');
      throw new AppError(`Group with name '${name}' already exists`, 409);
    }
    group.name = name.trim();
  }

  if (description !== undefined) {
    group.description = description;
  }

  await group.save();

  logger.info({ groupId: group._id, name: group.name }, 'Group updated successfully');
  return res.status(200).json(group);
});

// 5. GET /groups/:id/roles - Get all roles within a group
export const getGroupRoles = asyncHandler(async (req: Request, res: Response) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    logger.warn({ groupId: req.params.id, ip: req.ip }, 'Group roles lookup failed: Group not found');
    throw new AppError('Group not found', 404);
  }

  const roles = await Role.find({ group: group._id })
    .populate('permissions')
    .sort({ name: 1 });

  return res.status(200).json(roles);
});
