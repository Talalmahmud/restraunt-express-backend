import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ChangePasswordDto } from '../common/dto/change-password.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UserRole, EmployeeRole } from '../generated/prisma/enums';
import * as employeeService from './employee.service';

const ALL_EMPLOYEE_ROLES = [
  EmployeeRole.MANAGER,
  EmployeeRole.WAITER,
  EmployeeRole.CHEF,
  EmployeeRole.CASHIER,
  EmployeeRole.DELIVERY,
];

export const employeeRouter = Router();

employeeRouter.use(authenticate);

employeeRouter.post(
  '/',
  requireRoles(UserRole.ADMIN),
  validateBody(CreateEmployeeDto),
  asyncHandler(async (req, res) => {
    const result = await employeeService.createEmployee(req.body as CreateEmployeeDto);
    res.status(201).json(result);
  }),
);

employeeRouter.get(
  '/',
  requireRoles(UserRole.ADMIN, EmployeeRole.MANAGER),
  validateQuery(PaginationQueryDto),
  asyncHandler(async (req, res) => {
    const result = await employeeService.getAllEmployees(
      req.query as unknown as PaginationQueryDto,
    );
    res.status(200).json(result);
  }),
);

employeeRouter.patch(
  '/me/password',
  requireRoles(...ALL_EMPLOYEE_ROLES),
  validateBody(ChangePasswordDto),
  asyncHandler(async (req, res) => {
    const result = await employeeService.changePassword(
      req.user!.id,
      req.body as ChangePasswordDto,
    );
    res.status(200).json(result);
  }),
);

employeeRouter.get(
  '/:id',
  requireRoles(UserRole.ADMIN, EmployeeRole.MANAGER),
  asyncHandler(async (req, res) => {
    const result = await employeeService.getEmployeeById((req.params.id as string));
    res.status(200).json(result);
  }),
);

employeeRouter.patch(
  '/:id',
  requireRoles(UserRole.ADMIN),
  validateBody(UpdateEmployeeDto),
  asyncHandler(async (req, res) => {
    const result = await employeeService.updateEmployee(
      (req.params.id as string),
      req.body as UpdateEmployeeDto,
    );
    res.status(200).json(result);
  }),
);

employeeRouter.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await employeeService.deleteEmployee((req.params.id as string));
    res.status(200).json(result);
  }),
);
