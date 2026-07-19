import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { uploadSingleImage } from '../common/middleware/upload';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UserRole } from '../generated/prisma/enums';
import * as categoryService from './category.service';

export const categoryRouter = Router();

categoryRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN),
  uploadSingleImage,
  validateBody(CreateCategoryDto),
  asyncHandler(async (req, res) => {
    const result = await categoryService.createCategory(
      req.body as CreateCategoryDto,
      req.file,
    );
    res.status(201).json(result);
  }),
);

categoryRouter.get(
  '/',
  validateQuery(PaginationQueryDto),
  asyncHandler(async (req, res) => {
    const result = await categoryService.getAllCategories(
      req.query as unknown as PaginationQueryDto,
    );
    res.status(200).json(result);
  }),
);

categoryRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await categoryService.getCategoryById((req.params.id as string));
    res.status(200).json(result);
  }),
);

categoryRouter.patch(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  uploadSingleImage,
  validateBody(UpdateCategoryDto),
  asyncHandler(async (req, res) => {
    const result = await categoryService.updateCategory(
      (req.params.id as string),
      req.body as UpdateCategoryDto,
      req.file,
    );
    res.status(200).json(result);
  }),
);

categoryRouter.delete(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await categoryService.deleteCategory((req.params.id as string));
    res.status(200).json(result);
  }),
);
