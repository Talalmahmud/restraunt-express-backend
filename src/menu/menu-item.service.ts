import { prisma } from '../lib/prisma';
import * as cloudinary from '../cloudinary/cloudinary';
import type { Prisma } from '../generated/prisma/client';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import type { QueryMenuItemDto } from './dto/query-menu-item.dto';

const MENU_ITEM_FOLDER = 'menu-items';

export async function createMenuItem(
  dto: CreateMenuItemDto,
  files: Express.Multer.File[] = [],
) {
  const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
  if (!category) throw new NotFoundError('Category not found');

  const uploads = await Promise.all(
    files.map((file) => cloudinary.uploadImage(file, MENU_ITEM_FOLDER)),
  );

  return prisma.menuItem.create({
    data: {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock ?? 0,
      isAvailable: dto.isAvailable ?? true,
      categoryId: dto.categoryId,
      images: { create: uploads.map((upload) => ({ imagePublicId: upload.publicId })) },
    },
    include: { images: true, category: true },
  });
}

export async function getAllMenuItems(query: QueryMenuItemDto) {
  const where: Prisma.MenuItemWhereInput = {};
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.isAvailable !== undefined) where.isAvailable = query.isAvailable;
  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const { page, limit } = query;
  const [data, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.menuItem.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getMenuItemById(id: string) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: { images: true, category: true },
  });
  if (!menuItem) throw new NotFoundError('Menu item not found');
  return menuItem;
}

export async function updateMenuItem(id: string, dto: UpdateMenuItemDto) {
  await getMenuItemById(id);

  if (dto.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundError('Category not found');
  }

  return prisma.menuItem.update({
    where: { id },
    data: dto,
    include: { images: true, category: true },
  });
}

export async function deleteMenuItem(id: string) {
  const menuItem = await getMenuItemById(id);

  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (orderItemCount > 0) {
    throw new ConflictError('Cannot delete a menu item that appears in existing orders');
  }

  await Promise.all(
    menuItem.images.map((image) => cloudinary.deleteImage(image.imagePublicId)),
  );
  await prisma.menuItem.delete({ where: { id } });
  return { message: 'Menu item deleted successfully' };
}

export async function addImages(id: string, files: Express.Multer.File[]) {
  await getMenuItemById(id);
  if (!files.length) return getMenuItemById(id);

  const uploads = await Promise.all(
    files.map((file) => cloudinary.uploadImage(file, MENU_ITEM_FOLDER)),
  );

  await prisma.menuImage.createMany({
    data: uploads.map((upload) => ({ menuItemId: id, imagePublicId: upload.publicId })),
  });

  return getMenuItemById(id);
}

export async function deleteImage(id: string, imageId: string) {
  const image = await prisma.menuImage.findUnique({ where: { id: imageId } });
  if (!image || image.menuItemId !== id) {
    throw new NotFoundError('Image not found for this menu item');
  }

  await cloudinary.deleteImage(image.imagePublicId);
  await prisma.menuImage.delete({ where: { id: imageId } });
  return { message: 'Image deleted successfully' };
}
