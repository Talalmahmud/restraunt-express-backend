import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { EmployeeRole, UserRole } from '../generated/prisma/enums';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import * as tableService from './table.service';

const MANAGE_ROLES = [UserRole.ADMIN, EmployeeRole.MANAGER];
/** Everyone who takes orders needs to see the floor. */
const VIEW_ROLES = [...MANAGE_ROLES, EmployeeRole.WAITER, EmployeeRole.CASHIER];

export const tableRouter = Router();

tableRouter.use(authenticate);

tableRouter.get(
  '/',
  requireRoles(...VIEW_ROLES),
  asyncHandler(async (_req, res) => {
    res.status(200).json(await tableService.getAllTables());
  }),
);

tableRouter.post(
  '/',
  requireRoles(...MANAGE_ROLES),
  validateBody(CreateTableDto),
  asyncHandler(async (req, res) => {
    res.status(201).json(await tableService.createTable(req.body as CreateTableDto));
  }),
);

tableRouter.patch(
  '/:id',
  requireRoles(...MANAGE_ROLES),
  validateBody(UpdateTableDto),
  asyncHandler(async (req, res) => {
    res
      .status(200)
      .json(await tableService.updateTable(req.params.id as string, req.body as UpdateTableDto));
  }),
);

tableRouter.delete(
  '/:id',
  requireRoles(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    res.status(200).json(await tableService.deleteTable(req.params.id as string));
  }),
);
