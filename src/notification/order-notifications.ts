import { prisma } from '../lib/prisma';
import { EmployeeRole, OrderStatus } from '../generated/prisma/enums';
import { sendPush } from './push.service';

interface NotifiableOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  note: string | null;
  waiterId: string | null;
  table: { name: string } | null;
  orderItems: { quantity: number }[];
}

async function employeeIdsWithRole(role: EmployeeRole): Promise<string[]> {
  const rows = await prisma.employee.findMany({ where: { role }, select: { id: true } });
  return rows.map((r) => r.id);
}

function describe(order: NotifiableOrder) {
  const items = order.orderItems.reduce((sum, i) => sum + i.quantity, 0);
  const place = order.table ? `Table ${order.table.name}` : 'Takeaway';
  return `${place} · ${items} ${items === 1 ? 'item' : 'items'} · ${order.orderNumber}`;
}

/**
 * Alerts the right staff when an order reaches a new stage:
 *  - PENDING   -> waiters (someone else placed it; a waiter must confirm)
 *  - ACCEPTED  -> chefs (confirmed, ready to cook)
 *  - READY     -> the waiter who took it (or all waiters if unknown)
 *  - CANCELLED after confirmation -> chefs, so they stop cooking
 * Fire-and-forget: callers don't wait for delivery.
 */
export function notifyOrderStage(order: NotifiableOrder, previous?: OrderStatus): void {
  void (async () => {
    const data = { orderId: order.id, status: order.status };
    switch (order.status) {
      case OrderStatus.PENDING:
        await sendPush(await employeeIdsWithRole(EmployeeRole.WAITER), {
          title: 'New order to confirm',
          body: describe(order),
          data: { ...data, type: 'order-pending' },
        });
        break;
      case OrderStatus.ACCEPTED:
        await sendPush(await employeeIdsWithRole(EmployeeRole.CHEF), {
          title: 'New order for the kitchen',
          body: order.note ? `${describe(order)}\nNote: ${order.note}` : describe(order),
          data: { ...data, type: 'order-accepted' },
        });
        break;
      case OrderStatus.READY: {
        const waiters = order.waiterId
          ? [order.waiterId]
          : await employeeIdsWithRole(EmployeeRole.WAITER);
        await sendPush(waiters, {
          title: 'Order ready to serve',
          body: describe(order),
          data: { ...data, type: 'order-ready' },
        });
        break;
      }
      case OrderStatus.CANCELLED:
        if (previous === OrderStatus.ACCEPTED || previous === OrderStatus.COOKING) {
          await sendPush(await employeeIdsWithRole(EmployeeRole.CHEF), {
            title: 'Order cancelled',
            body: describe(order),
            data: { ...data, type: 'order-cancelled' },
          });
        }
        break;
      default:
        break;
    }
  })();
}
