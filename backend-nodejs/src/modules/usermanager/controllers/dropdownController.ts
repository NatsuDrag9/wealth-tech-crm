import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { DropdownOption } from '../../../common/types/dropdown';
import { Group } from '../models/Group';
import { Role } from '../models/Role';
import { User, IUser } from '../models/User';

// GET /groups/dropdown
export const getGroupsDropdown = asyncHandler(async (req: Request, res: Response) => {
  const groups = await Group.find().select('name _id').sort({ name: 1 });

  const options: DropdownOption<string>[] = groups.map((g) => ({
    display_name: g.name,
    value: g._id.toString(),
  }));

  return res.status(200).json(options);
});

// GET /roles/dropdown?groupId=
export const getRolesDropdown = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(200).json([]);
  }

  const roles = await Role.find({ group: groupId }).select('name _id').sort({ name: 1 });

  const options: DropdownOption<string>[] = roles.map((r) => ({
    display_name: r.name,
    value: r._id.toString(),
  }));

  return res.status(200).json(options);
});

// GET /users/dropdown?groupId=&excludeUserId=
export const getUsersDropdown = asyncHandler(async (req: Request, res: Response) => {
  const { groupId, excludeUserId } = req.query;

  if (!groupId) {
    return res.status(200).json([]);
  }

  // Type-safe filter query using Mongoose FilterQuery<IUser> (zero any)
  const filter: FilterQuery<IUser> = { group: groupId };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  const users = await User.find(filter).select('fullName email _id').sort({ fullName: 1 });

  const options: DropdownOption<string>[] = users.map((u) => ({
    display_name: `${u.fullName} (${u.email})`,
    value: u._id.toString(),
  }));

  return res.status(200).json(options);
});