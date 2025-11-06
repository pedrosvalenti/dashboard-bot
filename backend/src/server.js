import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { guildsRouter } from './routes/guilds.js';
import { healthRouter } from './routes/health.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

const corsOrigins = config.cors.allowedOrigins.length ? config.cors.allowedOrigins : undefined;
app.use(cors({
  origin: corsOrigins || true,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});
app.use(limiter);

app.get('/', (_req, res) => res.json({ name: 'bot-dashboard-api', status: 'ok' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/guilds', guildsRouter);

// OAuth helper: authorization URL
app.get('/api/auth/discord/login', (req, res) => {
  const redirect = new URL('https://discord.com/oauth2/authorize');
  redirect.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID || '');
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('redirect_uri', process.env.DISCORD_REDIRECT_URI || '');
  redirect.searchParams.set('scope', 'identify guilds');
  redirect.searchParams.set('prompt', 'consent');
  res.json({ url: redirect.toString() });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
