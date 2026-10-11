import { Router } from 'express';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { asyncHandler } from '../common/async-handler';
import { validateBody } from '../common/validate';
import { authenticate } from '../common/middleware/auth';
import { ForbiddenError } from '../common/errors/http-errors';
import { prisma } from '../lib/prisma';
import { registerPushToken, removePushToken, sendPush } from './push.service';

class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsIn(['android', 'ios'])
  platform: string;
}

export const notificationRouter = Router();

notificationRouter.use(authenticate);

/** Push notifications are for staff devices (employees), not customers. */
notificationRouter.use((req, _res, next) => {
  if (req.user?.type !== 'employee') {
    throw new ForbiddenError('Only staff can register for notifications');
  }
  next();
});

notificationRouter.post(
  '/',
  validateBody(RegisterPushTokenDto),
  asyncHandler(async (req, res) => {
    const { token, platform } = req.body as RegisterPushTokenDto;
    res.status(201).json(await registerPushToken(req.user!.id, token, platform));
  }),
);

notificationRouter.delete(
  '/:token',
  asyncHandler(async (req, res) => {
    res.status(200).json(await removePushToken(req.user!.id, req.params.token as string));
  }),
);

/** Sends a test notification to the caller's own devices. */
notificationRouter.post(
  '/test',
  asyncHandler(async (req, res) => {
    const registered = await prisma.pushToken.count({ where: { employeeId: req.user!.id } });
    const sent = registered
      ? await sendPush([req.user!.id], {
          title: 'Test notification',
          body: 'Notifications are working on this device.',
          data: { type: 'test' },
        })
      : 0;
    res.status(200).json({ registered, sent });
  }),
);
