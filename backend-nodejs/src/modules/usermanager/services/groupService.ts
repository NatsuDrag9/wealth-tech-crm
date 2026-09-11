import { FilterQuery } from 'mongoose';
import { Group, IGroup } from '../models/Group';
import { Role, IRole } from '../models/Role';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { CursorPaginationResponse } from '../../../common/types/pagination';
import { DropdownOption } from '../../../common/types/dropdown';

export class GroupService {
  // 1. Create a new group
  async createGroup(data: { name: string; description?: string }): Promise<IGroup> {
    const trimmedName = data.name.trim();

    const existingGroup = await Group.findOne({ name: trimmedName });
    if (existingGroup) {
      logger.warn({ name: trimmedName }, 'Group creation failed: Group name already exists');
      throw new AppError(`Group with name '${trimmedName}' already exists`, 409);
    }

    const group = await Group.create({
      name: trimmedName,
      description: data.description || '',
    });

    logger.info({ groupId: group._id, name: group.name }, 'Group created successfully');
    return group;
  }

  // 2. Get paginated groups with optional search and cursor
  async getGroups(params: {
    search?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<CursorPaginationResponse<IGroup>> {
    const limit = Math.min(params.pageSize || 50, 1500);
    const filter: FilterQuery<IGroup> = {};

    if (params.search) {
      filter.name = { $regex: String(params.search), $options: 'i' };
    }

    if (params.cursor) {
      filter._id = { $gt: params.cursor };
    }

    const [groups, totalCount] = await Promise.all([
      Group.find(filter).sort({ _id: 1 }).limit(limit + 1),
      Group.countDocuments(params.search ? filter : {}),
    ]);

    const hasNextPage = groups.length > limit;
    const results = hasNextPage ? groups.slice(0, limit) : groups;
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

  // 3. Get single group by ID
  async getGroupById(id: string): Promise<IGroup> {
    const group = await Group.findById(id);
    if (!group) {
      logger.warn({ groupId: id }, 'Group lookup failed: Group not found');
      throw new AppError('Group not found', 404);
    }
    return group;
  }

  // 4. Update group
  async updateGroup(id: string, data: { name?: string; description?: string }): Promise<IGroup> {
    const group = await this.getGroupById(id);

    if (data.name && data.name.trim() !== group.name) {
      const trimmedName = data.name.trim();
      const duplicate = await Group.findOne({
        name: trimmedName,
        _id: { $ne: group._id },
      });
      if (duplicate) {
        logger.warn({ name: trimmedName, groupId: id }, 'Group update failed: Group name already exists');
        throw new AppError(`Group with name '${trimmedName}' already exists`, 409);
      }
      group.name = trimmedName;
    }

    if (data.description !== undefined) {
      group.description = data.description;
    }

    const updatedGroup = await group.save();
    logger.info({ groupId: updatedGroup._id, name: updatedGroup.name }, 'Group updated successfully');
    return updatedGroup;
  }

  // 5. Get all roles scoped under a group
  async getGroupRoles(groupId: string): Promise<IRole[]> {
    await this.getGroupById(groupId); // Throws 404 if group doesn't exist

    return Role.find({ group: groupId })
      .populate('permissions')
      .sort({ name: 1 });
  }

  // 6. Get groups as dropdown options
  async getGroupsDropdown(): Promise<DropdownOption<string>[]> {
    const groups = await Group.find().select('name _id').sort({ name: 1 });
    return groups.map((g) => ({
      display_name: g.name,
      value: g._id.toString(),
    }));
  }
}

export const groupService = new GroupService();
