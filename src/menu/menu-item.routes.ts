import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { uploadImages } from '../common/middleware/upload';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { QueryMenuItemDto } from './dto/query-menu-item.dto';
import { UserRole } from '../generated/prisma/enums';
import * as menuItemService from './menu-item.service';

export const menuItemRouter = Router();

menuItemRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN),
  uploadImages,
  validateBody(CreateMenuItemDto),
  asyncHandler(async (req, res) => {
    const result = await menuItemService.createMenuItem(
      req.body as CreateMenuItemDto,
      (req.files as Express.Multer.File[] | undefined) ?? [],
    );
    res.status(201).json(result);
  }),
);

menuItemRouter.get(
  '/',
  validateQuery(QueryMenuItemDto),
  asyncHandler(async (req, res) => {
    const result = await menuItemService.getAllMenuItems(
      req.query as unknown as QueryMenuItemDto,
    );
    res.status(200).json(result);
  }),
);

menuItemRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await menuItemService.getMenuItemById((req.params.id as string));
    res.status(200).json(result);
  }),
);

menuItemRouter.patch(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validateBody(UpdateMenuItemDto),
  asyncHandler(async (req, res) => {
    const result = await menuItemService.updateMenuItem(
      (req.params.id as string),
      req.body as UpdateMenuItemDto,
    );
    res.status(200).json(result);
  }),
);

menuItemRouter.delete(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await menuItemService.deleteMenuItem((req.params.id as string));
    res.status(200).json(result);
  }),
);

menuItemRouter.post(
  '/:id/images',
  authenticate,
  requireRoles(UserRole.ADMIN),
  uploadImages,
  asyncHandler(async (req, res) => {
    const result = await menuItemService.addImages(
      (req.params.id as string),
      (req.files as Express.Multer.File[] | undefined) ?? [],
    );
    res.status(201).json(result);
  }),
);

menuItemRouter.delete(
  '/:id/images/:imageId',
  authenticate,
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await menuItemService.deleteImage((req.params.id as string), (req.params.imageId as string));
    res.status(200).json(result);
  }),
);
