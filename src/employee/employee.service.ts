import * as bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { ChangePasswordDto } from '../common/dto/change-password.dto';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

const SALT_ROUNDS = 10;

const EMPLOYEE_SAFE_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  salary: true,
  createdAt: true,
  updatedAt: true,
};

export async function createEmployee(dto: CreateEmployeeDto) {
  const existingPhone = await prisma.employee.findUnique({ where: { phone: dto.phone } });
  if (existingPhone) throw new ConflictError('Phone already registered');

  if (dto.email) {
    const existingEmail = await prisma.employee.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictError('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return prisma.employee.create({
    data: {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      salary: dto.salary,
    },
    select: EMPLOYEE_SAFE_SELECT,
  });
}

export async function getAllEmployees(pagination: PaginationQueryDto) {
  const { page, limit } = pagination;
  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      select: EMPLOYEE_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count(),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: EMPLOYEE_SAFE_SELECT,
  });
  if (!employee) throw new NotFoundError('Employee not found');
  return employee;
}

export async function updateEmployee(id: string, dto: UpdateEmployeeDto) {
  await getEmployeeById(id);
  return prisma.employee.update({ where: { id }, data: dto, select: EMPLOYEE_SAFE_SELECT });
}

export async function changePassword(id: string, dto: ChangePasswordDto) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new NotFoundError('Employee not found');

  if (
    !employee.password ||
    !(await bcrypt.compare(dto.currentPassword, employee.password))
  ) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
  await prisma.employee.update({ where: { id }, data: { password: hashedPassword } });
  return { message: 'Password updated successfully' };
}

export async function deleteEmployee(id: string) {
  await getEmployeeById(id);
  await prisma.employee.delete({ where: { id } });
  return { message: 'Employee deleted successfully' };
}
