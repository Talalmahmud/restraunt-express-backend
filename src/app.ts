import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { authRouter } from './auth/auth.routes';
import { userRouter } from './user/user.routes';
import { employeeRouter } from './employee/employee.routes';
import { categoryRouter } from './menu/category.routes';
import { menuItemRouter } from './menu/menu-item.routes';
import { orderRouter } from './order/order.routes';
import { paymentRouter } from './payment/payment.routes';
import { ledgerRouter } from './ledger/ledger.routes';
import { dashboardRouter } from './dashboard/dashboard.routes';
import { notFoundHandler, errorHandler } from './common/error-handler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Hello World!');
  });

  app.use('/auth', authRouter);
  app.use('/users', userRouter);
  app.use('/employees', employeeRouter);
  app.use('/categories', categoryRouter);
  app.use('/menu-items', menuItemRouter);
  app.use('/orders', orderRouter);
  app.use('/payments', paymentRouter);
  app.use('/ledgers', ledgerRouter);
  app.use('/dashboard', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
