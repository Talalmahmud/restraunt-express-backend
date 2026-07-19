import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError } from '../common/errors/http-errors';
import type { AuthUser } from '../types/auth-user.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

function signAccessToken(id: string, role: string, type: 'user' | 'employee') {
  return jwt.sign({ sub: id, role, type }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);
}

function signRefreshToken(id: string, role: string, type: 'user' | 'employee') {
  return jwt.sign({ sub: id, role, type }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

function buildAuthResponse(
  id: string,
  role: string,
  type: 'user' | 'employee',
  profile: Record<string, unknown>,
) {
  return {
    accessToken: signAccessToken(id, role, type),
    refreshToken: signRefreshToken(id, role, type),
    profile,
  };
}

export async function registerUser(dto: RegisterDto) {
  const existingPhone = await prisma.user.findUnique({ where: { phone: dto.phone } });
  if (existingPhone) throw new ConflictError('Phone already registered');

  if (dto.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictError('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
    },
  });

  return buildAuthResponse(user.id, user.role, 'user', {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
  });
}

export async function loginUser(dto: LoginDto) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ phone: dto.identifier }, { email: dto.identifier }] },
  });

  if (!user?.password || !(await bcrypt.compare(dto.password, user.password))) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return buildAuthResponse(user.id, user.role, 'user', {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
  });
}

export async function loginEmployee(dto: LoginDto) {
  const employee = await prisma.employee.findFirst({
    where: { OR: [{ phone: dto.identifier }, { email: dto.identifier }] },
  });

  if (
    !employee?.password ||
    !(await bcrypt.compare(dto.password, employee.password))
  ) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return buildAuthResponse(employee.id, employee.role, 'employee', {
    id: employee.id,
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    role: employee.role,
  });
}

export function refreshTokens(user: AuthUser) {
  return {
    accessToken: signAccessToken(user.id, user.role, user.type),
    refreshToken: signRefreshToken(user.id, user.role, user.type),
  };
}
