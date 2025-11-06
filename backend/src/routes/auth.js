import { Router } from 'express';
import { discordCallback, me, logout } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/discord/callback', discordCallback);
authRouter.get('/me', authRequired, me);
authRouter.post('/logout', authRequired, logout);
