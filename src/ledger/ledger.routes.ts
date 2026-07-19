import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody, validateQuery } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { UserRole, EmployeeRole } from '../generated/prisma/enums';
import * as ledgerService from './ledger.service';

export const ledgerRouter = Router();

ledgerRouter.use(authenticate, requireRoles(UserRole.ADMIN, EmployeeRole.MANAGER));

ledgerRouter.post(
  '/',
  validateBody(CreateLedgerDto),
  asyncHandler(async (req, res) => {
    const result = await ledgerService.createLedger(req.user!, req.body as CreateLedgerDto);
    res.status(201).json(result);
  }),
);

ledgerRouter.get(
  '/',
  validateQuery(QueryLedgerDto),
  asyncHandler(async (req, res) => {
    const result = await ledgerService.getAllLedgers(req.query as unknown as QueryLedgerDto);
    res.status(200).json(result);
  }),
);

ledgerRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await ledgerService.getLedgerById((req.params.id as string));
    res.status(200).json(result);
  }),
);

ledgerRouter.delete(
  '/:id',
  requireRoles(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const result = await ledgerService.deleteLedger((req.params.id as string));
    res.status(200).json(result);
  }),
);
