import * as bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { NotFoundError, UnauthorizedError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { ChangePasswordDto } from '../common/dto/change-password.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';

const SALT_ROUNDS = 10;

const USER_SAFE_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

export async function getAllUsers(pagination: PaginationQueryDto) {
  const { page, limit } = pagination;
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      select: USER_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SAFE_SELECT });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateUser(id: string, dto: UpdateUserDto) {
  await getUserById(id);
  return prisma.user.update({ where: { id }, data: dto, select: USER_SAFE_SELECT });
}

export async function updateUserRole(id: string, dto: UpdateUserRoleDto) {
  await getUserById(id);
  return prisma.user.update({
    where: { id },
    data: { role: dto.role },
    select: USER_SAFE_SELECT,
  });
}

export async function changePassword(id: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  if (!user.password || !(await bcrypt.compare(dto.currentPassword, user.password))) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
  return { message: 'Password updated successfully' };
}

export async function deleteUser(id: string) {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
  return { message: 'User deleted successfully' };
}
