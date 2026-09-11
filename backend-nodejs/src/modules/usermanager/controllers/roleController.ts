import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { roleService } from '../services/roleService';

// 1. POST /roles - Create a new role scoped to a group with empty permissions
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, groupId } = req.body;

  if (!name || !groupId) {
    logger.warn({ ip: req.ip }, 'Role creation failed: Missing name or groupId');
    throw new AppError('Role name and groupId are required', 400);
  }

  const role = await roleService.createRole({ name, description, groupId });
  return res.status(201).json(role);
});

// 2. GET /roles/:id - Fetch a single role with assigned permissions
export const getRoleDetail = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.getRoleById(req.params.id);
  return res.status(200).json(role);
});

// 3. PATCH /roles/:id - Update role name or description
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.updateRole(req.params.id, req.body);
  return res.status(200).json(role);
});

// 4. POST /roles/:id/set-permissions - Assign permissions to role
export const setRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionIds } = req.body;
  const updatedRole = await roleService.setRolePermissions(req.params.id, permissionIds);
  return res.status(200).json(updatedRole);
});