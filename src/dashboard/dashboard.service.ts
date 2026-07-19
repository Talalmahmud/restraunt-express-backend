import { prisma } from '../lib/prisma';
import { LedgerType, OrderStatus, PaymentStatus } from '../generated/prisma/enums';

export async function getSummary() {
  const [
    totalUsers,
    totalEmployees,
    totalMenuItems,
    totalOrders,
    pendingOrders,
    revenueAgg,
    incomeAgg,
    expenseAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.menuItem.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PAID } }),
    prisma.ledger.aggregate({ _sum: { amount: true }, where: { type: LedgerType.INCOME } }),
    prisma.ledger.aggregate({ _sum: { amount: true }, where: { type: LedgerType.EXPENSE } }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;

  return {
    totalUsers,
    totalEmployees,
    totalMenuItems,
    totalOrders,
    pendingOrders,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
  };
}

export async function getTopMenuItems(limit: number) {
  const grouped = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: grouped.map((g) => g.menuItemId) } },
  });

  return grouped.map((g) => ({
    menuItem: menuItems.find((m) => m.id === g.menuItemId) ?? null,
    totalSold: g._sum.quantity ?? 0,
  }));
}

export async function getRecentOrders(limit: number) {
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, phone: true } },
      orderItems: true,
    },
  });
}
