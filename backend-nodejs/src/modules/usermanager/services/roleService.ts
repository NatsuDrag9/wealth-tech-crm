import { Role, IRole } from '../models/Role';
import { Group } from '../models/Group';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { DropdownOption } from '../../../common/types/dropdown';

export class RoleService {
  // 1. Create a new role scoped to a group
  async createRole(data: { name: string; description?: string; groupId: string }): Promise<IRole> {
    const { name, description, groupId } = data;

    const group = await Group.findById(groupId);
    if (!group) {
      logger.warn({ groupId }, 'Role creation failed: Parent group not found');
      throw new AppError('Parent group not found', 404);
    }

    const trimmedName = name.trim();
    const existingRole = await Role.findOne({
      name: trimmedName,
      group: groupId,
    });

    if (existingRole) {
      logger.warn({ name: trimmedName, groupId }, 'Role creation failed: Role already exists in group');
      throw new AppError(`Role '${trimmedName}' already exists in this group`, 409);
    }

    const role = await Role.create({
      name: trimmedName,
      description: description || '',
      group: groupId,
      permissions: [],
    });

    logger.info({ roleId: role._id, name: role.name, groupId }, 'Role created successfully');
    return role;
  }

  // 2. Get role by ID with populated permissions and group
  async getRoleById(id: string): Promise<IRole> {
    const role = await Role.findById(id)
      .populate('permissions')
      .populate('group', 'name');

    if (!role) {
      logger.warn({ roleId: id }, 'Role lookup failed: Role not found');
      throw new AppError('Role not found', 404);
    }

    return role;
  }

  // 3. Update role name or description
  async updateRole(id: string, data: { name?: string; description?: string }): Promise<IRole> {
    const role = await Role.findById(id);
    if (!role) {
      logger.warn({ roleId: id }, 'Role update failed: Role not found');
      throw new AppError('Role not found', 404);
    }

    if (data.name && data.name.trim() !== role.name) {
      const trimmedName = data.name.trim();
      const duplicate = await Role.findOne({
        name: trimmedName,
        group: role.group,
        _id: { $ne: role._id },
      });

      if (duplicate) {
        logger.warn({ name: trimmedName, groupId: role.group }, 'Role update failed: Duplicate role in group');
        throw new AppError(`Role '${trimmedName}' already exists in this group`, 409);
      }
      role.name = trimmedName;
    }

    if (data.description !== undefined) {
      role.description = data.description;
    }

    const updatedRole = await role.save();
    logger.info({ roleId: updatedRole._id, name: updatedRole.name }, 'Role updated successfully');
    return updatedRole;
  }

  // 4. Set role permissions
  async setRolePermissions(id: string, permissionIds: string[]): Promise<IRole> {
    if (!Array.isArray(permissionIds)) {
      logger.warn({ roleId: id }, 'Set permissions failed: permissionIds is not an array');
      throw new AppError('permissionIds must be an array of permission IDs', 400);
    }

    const role = await Role.findById(id);
    if (!role) {
      logger.warn({ roleId: id }, 'Set permissions failed: Role not found');
      throw new AppError('Role not found when setting permissions', 404);
    }

    role.permissions = permissionIds as any;
    await role.save();

    const populatedRole = await Role.findById(role._id).populate('permissions');
    if (!populatedRole) {
      logger.warn({ roleId: id }, 'Set permissions failed: Could not reload populated role');
      throw new AppError('Role not found', 404);
    }

    logger.info(
      { roleId: role._id, permissionsCount: permissionIds.length },
      'Role permissions assigned successfully'
    );
    return populatedRole;
  }

  // 5. Get roles as dropdown options, optionally filtered by groupId
  async getRolesDropdown(groupId?: string): Promise<DropdownOption<string>[]> {
    if (!groupId) {
      return [];
    }

    const roles = await Role.find({ group: groupId }).select('name _id').sort({ name: 1 });
    return roles.map((r) => ({
      display_name: r.name,
      value: r._id.toString(),
    }));
  }
}

export const roleService = new RoleService();
