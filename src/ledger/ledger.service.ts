import { prisma } from '../lib/prisma';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { AuthUser } from '../types/auth-user.interface';
import type { CreateLedgerDto } from './dto/create-ledger.dto';
import type { QueryLedgerDto } from './dto/query-ledger.dto';

export async function createLedger(requester: AuthUser, dto: CreateLedgerDto) {
  if (dto.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundError('Employee not found');
  }

  return prisma.ledger.create({
    data: {
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      employeeId: dto.employeeId,
      userId: requester.type === 'user' ? requester.id : undefined,
    },
  });
}

export async function getAllLedgers(query: QueryLedgerDto) {
  const where = query.type ? { type: query.type } : undefined;
  const { page, limit } = query;
  const [data, total] = await Promise.all([
    prisma.ledger.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledger.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getLedgerById(id: string) {
  const ledger = await prisma.ledger.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true } },
      employee: { select: { id: true, name: true } },
    },
  });
  if (!ledger) throw new NotFoundError('Ledger entry not found');
  return ledger;
}

export async function deleteLedger(id: string) {
  const ledger = await getLedgerById(id);
  if (ledger.paymentId) {
    throw new ConflictError('Cannot delete a ledger entry generated from a payment');
  }
  await prisma.ledger.delete({ where: { id } });
  return { message: 'Ledger entry deleted successfully' };
}
