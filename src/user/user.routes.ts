import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ChangePasswordDto } from '../common/dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from '../generated/prisma/enums';
import * as userService from './user.service';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get(
  '/',
  requireRoles(UserRole.ADMIN),
  validateQuery(PaginationQueryDto),
  asyncHandler(async (req, res) => {
    const result = await userService.getAllUsers(req.query as unknown as PaginationQueryDto);
    res.status(200).json(result);
  }),
);

userRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const result = await userService.getUserById(req.user!.id);
    res.status(200).json(result);
  }),
);

userRouter.patch(
  '/me',
  validateBody(UpdateUserDto),
  asyncHandler(async (req, res) => {
    const result = await userService.updateUser(req.user!.id, req.body as UpdateUserDto);
    res.status(200).json(result);
  }),
);

userRouter.patch(
  '/me/password',
  validateBody(ChangePasswordDto),
  asyncHandler(async (req, res) => {
    const result = await userService.changePassword(
      req.user!.id,
      req.body as ChangePasswordDto,
    );
    res.status(200).json(result);
  }),
);

userRouter.get(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await userService.getUserById((req.params.id as string));
    res.status(200).json(result);
  }),
);

userRouter.patch(
  '/:id/role',
  requireRoles(UserRole.ADMIN),
  validateBody(UpdateUserRoleDto),
  asyncHandler(async (req, res) => {
    const result = await userService.updateUserRole(
      (req.params.id as string),
      req.body as UpdateUserRoleDto,
    );
    res.status(200).json(result);
  }),
);

userRouter.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await userService.deleteUser((req.params.id as string));
    res.status(200).json(result);
  }),
);
