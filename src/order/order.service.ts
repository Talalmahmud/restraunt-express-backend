import { prisma } from '../lib/prisma';
import { EmployeeRole, OrderStatus } from '../generated/prisma/enums';
import { notifyOrderStage } from '../notification/order-notifications';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { Prisma } from '../generated/prisma/client';
import type { QueryOrderDto } from './dto/query-order.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  orderItems: { include: { menuItem: { include: { images: true } } } },
  user: { select: { id: true, fullName: true, phone: true } },
  employee: { select: { id: true, name: true, role: true } },
  waiter: { select: { id: true, name: true } },
  table: { select: { id: true, name: true } },
  payment: true,
};

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}

export interface CreateOrderOptions {
  /** The employee placing the order (a walk-in order taken by staff). */
  employeeId?: string;
  /** Set when a waiter takes the order: it is then confirmed straight away. */
  waiterId?: string;
}

export async function createOrder(
  userId: string | undefined,
  dto: CreateOrderDto,
  { employeeId, waiterId }: CreateOrderOptions = {},
) {
  const order = await prisma.$transaction(async (tx) => {
    if (dto.tableId) {
      const table = await tx.table.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundError('Table not found');
    }

    let total = 0;
    const itemsData: {
      menuItemId: string;
      quantity: number;
      price: number;
      total: number;
    }[] = [];

    for (const item of dto.items) {
      const menuItem = await tx.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem) {
        throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
      }
      if (!menuItem.isAvailable) {
        throw new ConflictError(`${menuItem.name} is not available`);
      }
      if (menuItem.stock < item.quantity) {
        throw new ConflictError(`Insufficient stock for ${menuItem.name}`);
      }

      const lineTotal = menuItem.price * item.quantity;
      total += lineTotal;
      itemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
        total: lineTotal,
      });

      await tx.menuItem.update({
        where: { id: item.menuItemId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const discount = dto.discount ?? 0;
    const vat = dto.vat ?? 0;
    const grandTotal = total - discount + vat;

    return tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        employeeId,
        waiterId,
        tableId: dto.tableId,
        // A waiter taking the order *is* the confirmation; everyone else's
        // orders wait for a waiter to confirm them.
        status: waiterId ? OrderStatus.ACCEPTED : OrderStatus.PENDING,
        total,
        discount,
        vat,
        grandTotal,
        note: dto.note,
        orderItems: { create: itemsData },
      },
      include: ORDER_INCLUDE,
    });
  });

  notifyOrderStage(order);
  return order;
}

export async function getAllOrders(query: QueryOrderDto) {
  const { page, limit } = query;
  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.tableId) where.tableId = query.tableId;
  if (query.payment === 'UNPAID') where.payment = { is: null };
  else if (query.payment) where.payment = { is: { status: query.payment } };
  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' as const };
    where.OR = [
      { orderNumber: contains },
      { user: { is: { fullName: contains } } },
      { user: { is: { phone: contains } } },
    ];
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(`${query.from.slice(0, 10)}T00:00:00.000Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) } : {}),
    };
  }
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function updateOrderStatus(
  id: string,
  dto: UpdateOrderStatusDto,
  actor: { employeeId?: string; role?: string } = {},
) {
  const { employeeId } = actor;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  if (!order) throw new NotFoundError('Order not found');

  if (order.status === OrderStatus.CANCELLED) {
    throw new ConflictError('Order is already cancelled');
  }
  if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.SERVED) {
    throw new ConflictError('Cannot change the status of a completed order');
  }

  // A waiter who confirms someone else's order becomes its waiter, so they
  // are the one told when it is ready.
  const becomesWaiter =
    dto.status === OrderStatus.ACCEPTED &&
    actor.role === EmployeeRole.WAITER &&
    !order.waiterId &&
    employeeId;

  const updated = await prisma.$transaction(async (tx) => {
    if (dto.status === OrderStatus.CANCELLED) {
      for (const item of order.orderItems) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id },
      data: {
        status: dto.status,
        employeeId: employeeId ?? order.employeeId,
        ...(becomesWaiter ? { waiterId: employeeId } : {}),
      },
      include: ORDER_INCLUDE,
    });
  });

  if (dto.status !== order.status) notifyOrderStage(updated, order.status);
  return updated;
}

export async function deleteOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: { include: { ledger: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');

  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED) {
    throw new ConflictError('Only pending or cancelled orders can be deleted');
  }

  await prisma.$transaction(async (tx) => {
    if (order.payment?.ledger) {
      await tx.ledger.delete({ where: { id: order.payment.ledger.id } });
    }
    if (order.payment) {
      await tx.payment.delete({ where: { id: order.payment.id } });
    }
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });

  return { message: 'Order deleted successfully' };
}
