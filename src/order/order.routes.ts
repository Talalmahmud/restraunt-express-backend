import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { ForbiddenError } from '../common/errors/http-errors';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole, EmployeeRole } from '../generated/prisma/enums';
import * as orderService from './order.service';

const STAFF_ROLES = [
  UserRole.ADMIN,
  EmployeeRole.MANAGER,
  EmployeeRole.WAITER,
  EmployeeRole.CHEF,
  EmployeeRole.CASHIER,
  EmployeeRole.DELIVERY,
];

/** Employee roles allowed to place a walk-in order (no customer account attached). */
const WALK_IN_ORDER_ROLES: string[] = [EmployeeRole.MANAGER, EmployeeRole.CASHIER];

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post(
  '/',
  validateBody(CreateOrderDto),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const dto = req.body as CreateOrderDto;

    let result;
    if (user.type === 'user') {
      result = await orderService.createOrder(user.id, dto);
    } else if (user.type === 'employee' && WALK_IN_ORDER_ROLES.includes(user.role)) {
      // Walk-in order taken by staff on behalf of a customer with no account.
      result = await orderService.createOrder(undefined, dto, user.id);
    } else {
      throw new ForbiddenError('Only customers, managers, or cashiers can place orders');
    }
    res.status(201).json(result);
  }),
);

orderRouter.get(
  '/',
  requireRoles(...STAFF_ROLES),
  validateQuery(PaginationQueryDto),
  asyncHandler(async (req, res) => {
    const result = await orderService.getAllOrders(req.query as unknown as PaginationQueryDto);
    res.status(200).json(result);
  }),
);

orderRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.type !== 'user') {
      throw new ForbiddenError('Only customers have personal orders');
    }
    const result = await orderService.getOrdersForUser(user.id);
    res.status(200).json(result);
  }),
);

orderRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const order = await orderService.getOrderById((req.params.id as string));
    const isOwner = user.type === 'user' && order.userId === user.id;
    const isStaff = user.type === 'employee' || user.role === UserRole.ADMIN;
    if (!isOwner && !isStaff) {
      throw new ForbiddenError('You cannot view this order');
    }
    res.status(200).json(order);
  }),
);

orderRouter.patch(
  '/:id/status',
  requireRoles(...STAFF_ROLES),
  validateBody(UpdateOrderStatusDto),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const employeeId = user.type === 'employee' ? user.id : undefined;
    const result = await orderService.updateOrderStatus(
      (req.params.id as string),
      req.body as UpdateOrderStatusDto,
      employeeId,
    );
    res.status(200).json(result);
  }),
);

orderRouter.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await orderService.deleteOrder((req.params.id as string));
    res.status(200).json(result);
  }),
);
