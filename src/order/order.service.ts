import { prisma } from '../lib/prisma';
import { OrderStatus } from '../generated/prisma/enums';
import { ConflictError, NotFoundError } from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  orderItems: { include: { menuItem: { include: { images: true } } } },
  user: { select: { id: true, fullName: true, phone: true } },
  employee: { select: { id: true, name: true, role: true } },
  payment: true,
};

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}

export async function createOrder(
  userId: string | undefined,
  dto: CreateOrderDto,
  employeeId?: string,
) {
  return prisma.$transaction(async (tx) => {
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
}

export async function getAllOrders(pagination: PaginationQueryDto) {
  const { page, limit } = pagination;
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count(),
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
  employeeId?: string,
) {
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

  return prisma.$transaction(async (tx) => {
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
      data: { status: dto.status, employeeId: employeeId ?? order.employeeId },
      include: ORDER_INCLUDE,
    });
  });
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
