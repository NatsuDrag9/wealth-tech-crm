import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { Group } from '../models/Group';
import { Role } from '../models/Role';

// 1. POST /roles - Create a new role scoped to a group with empty permissions
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, groupId } = req.body;

  if (!name || !groupId) {
    logger.warn({ ip: req.ip }, 'Role creation failed: Missing name or groupId');
    throw new AppError('Role name and groupId are required', 400);
  }

  // Ensure parent group exists
  const group = await Group.findById(groupId);
  if (!group) {
    logger.warn({ groupId, ip: req.ip }, 'Role creation failed: Parent group not found');
    throw new AppError('Parent group not found', 404);
  }

  // Enforce compound uniqueness (name within a group)
  const existingRole = await Role.findOne({
    name: name.trim(),
    group: groupId,
  });

  if (existingRole) {
    logger.warn({ name: name.trim(), groupId, ip: req.ip }, 'Role creation failed: Duplicate role in group');
    throw new AppError(`Role '${name}' already exists in this group`, 409);
  }

  // Create role with empty permissions initially (Step 1)
  const role = await Role.create({
    name: name.trim(),
    description: description || '',
    group: groupId,
    permissions: [],
  });

  logger.info({ roleId: role._id, name: role.name, groupId }, 'Role created successfully');
  return res.status(201).json(role);
});

// 2. GET /roles/:id - Fetch a single role with assigned permissions
export const getRoleDetail = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id)
    .populate('permissions')
    .populate('group', 'name');

  if (!role) {
    logger.warn({ roleId: req.params.id, ip: req.ip }, 'Role lookup failed: Role not found');
    throw new AppError('Role not found', 404);
  }

  return res.status(200).json(role);
});

// 3. PATCH /roles/:id - Update role name or description
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const role = await Role.findById(req.params.id);
  if (!role) {
    logger.warn({ roleId: req.params.id, ip: req.ip }, 'Role update failed: Role not found');
    throw new AppError('Role not found', 404);
  }

  // If renaming, ensure name uniqueness within the same group
  if (name && name.trim() !== role.name) {
    const duplicate = await Role.findOne({
      name: name.trim(),
      group: role.group,
      _id: { $ne: role._id },
    });

    if (duplicate) {
      logger.warn({ name: name.trim(), groupId: role.group }, 'Role update failed: Duplicate role in group');
      throw new AppError(`Role '${name}' already exists in this group`, 409);
    }

    role.name = name.trim();
  }

  if (description !== undefined) {
    role.description = description;
  }

  await role.save();

  logger.info({ roleId: role._id, name: role.name }, 'Role updated successfully');
  return res.status(200).json(role);
});

// 4. POST /roles/:id/set-permissions - Assign permissions to role (Step 2)
export const setRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionIds } = req.body;

  if (!Array.isArray(permissionIds)) {
    logger.warn({ roleId: req.params.id, ip: req.ip }, 'Set permissions failed: permissionIds must be an array');
    throw new AppError('permissionIds must be an array of permission IDs', 400);
  }

  const role = await Role.findById(req.params.id);
  if (!role) {
    logger.warn({ roleId: req.params.id, ip: req.ip }, 'Set permissions failed: Role not found');
    throw new AppError('Role not found when setting permissions', 404);
  }

  // Update permissions array
  role.permissions = permissionIds;
  await role.save();

  // Return populated role
  const updatedRole = await Role.findById(role._id).populate('permissions');

  logger.info(
    { roleId: role._id, permissionsCount: permissionIds.length },
    'Role permissions assigned successfully'
  );

  return res.status(200).json(updatedRole);
});