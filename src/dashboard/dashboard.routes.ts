import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { authenticate } from '../common/middleware/auth';
import { requireRoles } from '../common/middleware/roles';
import { UserRole, EmployeeRole } from '../generated/prisma/enums';
import * as dashboardService from './dashboard.service';

function parseLimit(value: unknown, defaultValue: number): number {
  const parsed = parseInt(String(value ?? defaultValue), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireRoles(UserRole.ADMIN, EmployeeRole.MANAGER));

dashboardRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const result = await dashboardService.getSummary();
    res.status(200).json(result);
  }),
);

dashboardRouter.get(
  '/top-menu-items',
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit, 5);
    const result = await dashboardService.getTopMenuItems(limit);
    res.status(200).json(result);
  }),
);

dashboardRouter.get(
  '/recent-orders',
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit, 10);
    const result = await dashboardService.getRecentOrders(limit);
    res.status(200).json(result);
  }),
);
