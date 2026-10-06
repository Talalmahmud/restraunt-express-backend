import { prisma } from '../lib/prisma';
import * as cloudinary from '../cloudinary/cloudinary';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_FOLDER = 'categories';

/** Lets the dashboard show item counts and warn before blocked deletes. */
const withItemCount = { _count: { select: { menuItems: true } } } as const;

export async function createCategory(dto: CreateCategoryDto, file?: Express.Multer.File) {
  const existing = await prisma.category.findUnique({ where: { name: dto.name } });
  if (existing) throw new ConflictError('Category name already exists');

  let imagePublicId: string | undefined;
  if (file) {
    const uploaded = await cloudinary.uploadImage(file, CATEGORY_FOLDER);
    imagePublicId = uploaded.publicId;
  }

  return prisma.category.create({ data: { name: dto.name, imagePublicId } });
}

export async function getAllCategories(pagination: PaginationQueryDto) {
  const { page, limit } = pagination;
  const [data, total] = await Promise.all([
    prisma.category.findMany({
      include: withItemCount,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.count(),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, include: withItemCount });
  if (!category) throw new NotFoundError('Category not found');
  return category;
}

export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
  file?: Express.Multer.File,
) {
  const category = await getCategoryById(id);

  let imagePublicId = category.imagePublicId;
  if (file) {
    const uploaded = await cloudinary.uploadImage(file, CATEGORY_FOLDER);
    if (category.imagePublicId) {
      await cloudinary.deleteImage(category.imagePublicId);
    }
    imagePublicId = uploaded.publicId;
  }

  return prisma.category.update({ where: { id }, data: { name: dto.name, imagePublicId } });
}

export async function deleteCategory(id: string) {
  const category = await getCategoryById(id);

  const menuItemCount = await prisma.menuItem.count({ where: { categoryId: id } });
  if (menuItemCount > 0) {
    throw new ConflictError('Cannot delete a category that still has menu items');
  }

  if (category.imagePublicId) {
    await cloudinary.deleteImage(category.imagePublicId);
  }
  await prisma.category.delete({ where: { id } });
  return { message: 'Category deleted successfully' };
}
