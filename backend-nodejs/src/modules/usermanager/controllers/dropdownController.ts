import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { groupService } from '../services/groupService';
import { roleService } from '../services/roleService';
import { userService } from '../services/userService';

// GET /groups/dropdown
export const getGroupsDropdown = asyncHandler(async (req: Request, res: Response) => {
  const options = await groupService.getGroupsDropdown();
  return res.status(200).json(options);
});

// GET /roles/dropdown?groupId=
export const getRolesDropdown = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.query;
  const options = await roleService.getRolesDropdown(groupId as string | undefined);
  return res.status(200).json(options);
});

// GET /users/dropdown?groupId=&excludeUserId=
export const getUsersDropdown = asyncHandler(async (req: Request, res: Response) => {
  const { groupId, excludeUserId } = req.query;
  const options = await userService.getUsersDropdown(
    groupId as string | undefined,
    excludeUserId as string | undefined
  );
  return res.status(200).json(options);
});