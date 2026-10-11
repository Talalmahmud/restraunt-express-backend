import { prisma } from '../lib/prisma';
import { OrderStatus, PaymentStatus } from '../generated/prisma/enums';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import type { CreateTableDto } from './dto/create-table.dto';
import type { UpdateTableDto } from './dto/update-table.dto';

/**
 * A table is occupied while it has an order that is neither cancelled nor
 * delivered and hasn't been paid yet: guests are still seated until they pay.
 */
const ACTIVE_ORDER_FILTER = {
  status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DELIVERED] },
  OR: [{ payment: { is: null } }, { payment: { is: { status: { not: PaymentStatus.PAID } } } }],
};

const WITH_ACTIVE_ORDERS = {
  orders: {
    where: ACTIVE_ORDER_FILTER,
    select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
};

function withOccupancy<T extends { orders: unknown[] }>(table: T) {
  const { orders, ...rest } = table;
  return { ...rest, activeOrders: orders, occupied: orders.length > 0 };
}

async function ensureNameFree(name: string, exceptId?: string) {
  const existing = await prisma.table.findUnique({ where: { name } });
  if (existing && existing.id !== exceptId) throw new ConflictError('A table with this name already exists');
}

/** Every table with its current orders. There are few tables, so no paging. */
export async function getAllTables() {
  const tables = await prisma.table.findMany({
    orderBy: { name: 'asc' },
    include: WITH_ACTIVE_ORDERS,
  });
  // "T2" before "T10": compare names naturally rather than alphabetically.
  tables.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return tables.map(withOccupancy);
}

export async function createTable(dto: CreateTableDto) {
  const name = dto.name.trim();
  await ensureNameFree(name);
  const table = await prisma.table.create({
    data: { name, seats: dto.seats ?? 4 },
    include: WITH_ACTIVE_ORDERS,
  });
  return withOccupancy(table);
}

export async function updateTable(id: string, dto: UpdateTableDto) {
  const existing = await prisma.table.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Table not found');

  const name = dto.name?.trim();
  if (name) await ensureNameFree(name, id);

  const table = await prisma.table.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(dto.seats ? { seats: dto.seats } : {}) },
    include: WITH_ACTIVE_ORDERS,
  });
  return withOccupancy(table);
}

export async function deleteTable(id: string) {
  const table = await prisma.table.findUnique({ where: { id }, include: WITH_ACTIVE_ORDERS });
  if (!table) throw new NotFoundError('Table not found');
  if (table.orders.length > 0) {
    throw new ConflictError('This table still has an active order');
  }
  // Past orders keep their history; their table reference is cleared.
  await prisma.table.delete({ where: { id } });
  return { message: 'Table deleted successfully' };
}
