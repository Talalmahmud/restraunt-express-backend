import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { ForbiddenError } from '../common/errors/http-errors';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UserRole, EmployeeRole } from '../generated/prisma/enums';
import * as paymentService from './payment.service';

const STAFF_ROLES = [UserRole.ADMIN, EmployeeRole.MANAGER, EmployeeRole.CASHIER];

export const paymentRouter = Router();

paymentRouter.use(authenticate);

paymentRouter.post(
  '/',
  validateBody(CreatePaymentDto),
  asyncHandler(async (req, res) => {
    const result = await paymentService.createPayment(req.user!, req.body as CreatePaymentDto);
    res.status(201).json(result);
  }),
);

paymentRouter.get(
  '/',
  requireRoles(...STAFF_ROLES),
  validateQuery(PaginationQueryDto),
  asyncHandler(async (req, res) => {
    const result = await paymentService.getAllPayments(
      req.query as unknown as PaginationQueryDto,
    );
    res.status(200).json(result);
  }),
);

paymentRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.type !== 'user') {
      throw new ForbiddenError('Only customers have personal payments');
    }
    const result = await paymentService.getPaymentsForUser(user.id);
    res.status(200).json(result);
  }),
);

paymentRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const payment = await paymentService.getPaymentById((req.params.id as string));
    const isOwner = user.type === 'user' && payment.userId === user.id;
    const isStaff = user.type === 'employee' || user.role === UserRole.ADMIN;
    if (!isOwner && !isStaff) {
      throw new ForbiddenError('You cannot view this payment');
    }
    res.status(200).json(payment);
  }),
);

paymentRouter.patch(
  '/:id/status',
  requireRoles(...STAFF_ROLES),
  validateBody(UpdatePaymentStatusDto),
  asyncHandler(async (req, res) => {
    const result = await paymentService.updatePaymentStatus(
      (req.params.id as string),
      req.body as UpdatePaymentStatusDto,
    );
    res.status(200).json(result);
  }),
);

paymentRouter.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await paymentService.deletePayment((req.params.id as string));
    res.status(200).json(result);
  }),
);
