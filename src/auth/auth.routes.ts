import { Router } from 'express';
import { asyncHandler } from '../common/async-handler';
import { validateBody } from '../common/validate';
import { authenticateRefresh } from '../common/middleware/auth';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as authService from './auth.service';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(RegisterDto),
  asyncHandler(async (req, res) => {
    const result = await authService.registerUser(req.body as RegisterDto);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  validateBody(LoginDto),
  asyncHandler(async (req, res) => {
    const result = await authService.loginUser(req.body as LoginDto);
    res.status(200).json(result);
  }),
);

authRouter.post(
  '/employee/login',
  validateBody(LoginDto),
  asyncHandler(async (req, res) => {
    const result = await authService.loginEmployee(req.body as LoginDto);
    res.status(200).json(result);
  }),
);

authRouter.post(
  '/refresh',
  authenticateRefresh,
  asyncHandler(async (req, res) => {
    const result = authService.refreshTokens(req.user!);
    res.status(200).json(result);
  }),
);
