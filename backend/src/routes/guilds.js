import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listGuilds, getGuildStats, getSettings, updateSettings } from '../controllers/guildController.js';

export const guildsRouter = Router();

guildsRouter.use(authRequired);
guildsRouter.get('/', listGuilds);
guildsRouter.get('/:guildId/stats', getGuildStats);
guildsRouter.get('/:guildId/settings', getSettings);
guildsRouter.put('/:guildId/settings', updateSettings);
