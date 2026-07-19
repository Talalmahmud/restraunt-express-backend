import { prisma } from '../lib/prisma';
import { LedgerType, PaymentStatus, UserRole } from '../generated/prisma/enums';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../common/errors/http-errors';
import { buildPaginatedResult } from '../common/paginate';
import type { AuthUser } from '../types/auth-user.interface';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

const PAYMENT_INCLUDE = {
  order: true,
  user: { select: { id: true, fullName: true, phone: true } },
  ledger: true,
};

export async function createPayment(requester: AuthUser, dto: CreatePaymentDto) {
  const order = await prisma.order.findUnique({
    where: { id: dto.orderId },
    include: { payment: true },
  });
  if (!order) throw new NotFoundError('Order not found');
  if (order.payment) {
    throw new ConflictError('Order already has a payment');
  }

  const isOwner = requester.type === 'user' && order.userId === requester.id;
  const isStaff = requester.type === 'employee' || requester.role === UserRole.ADMIN;
  if (!isOwner && !isStaff) {
    throw new ForbiddenError('You cannot pay for this order');
  }

  return prisma.payment.create({
    data: {
      orderId: order.id,
      userId: order.userId,
      amount: order.grandTotal,
      method: dto.method,
      transactionId: dto.transactionId,
    },
    include: PAYMENT_INCLUDE,
  });
}

export async function getAllPayments(pagination: PaginationQueryDto) {
  const { page, limit } = pagination;
  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count(),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getPaymentsForUser(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: PAYMENT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
}

export async function updatePaymentStatus(id: string, dto: UpdatePaymentStatusDto) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { ledger: true },
  });
  if (!payment) throw new NotFoundError('Payment not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: { status: dto.status },
      include: PAYMENT_INCLUDE,
    });

    if (dto.status === PaymentStatus.PAID && !payment.ledger) {
      await tx.ledger.create({
        data: {
          type: LedgerType.INCOME,
          amount: payment.amount,
          description: `Payment received for order ${payment.orderId}`,
          userId: payment.userId,
          paymentId: payment.id,
        },
      });
    }

    if (dto.status === PaymentStatus.REFUNDED && payment.ledger) {
      await tx.ledger.delete({ where: { id: payment.ledger.id } });
    }

    return updated;
  });
}

export async function deletePayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError('Payment not found');

  if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.FAILED) {
    throw new ConflictError('Only pending or failed payments can be deleted');
  }

  await prisma.payment.delete({ where: { id } });
  return { message: 'Payment deleted successfully' };
}
