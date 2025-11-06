import { exchangeCodeForToken, getCurrentUser } from '../services/discord.js';
import { signSession } from '../middleware/auth.js';
import { config } from '../config.js';

export async function discordCallback(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const tokenData = await exchangeCodeForToken(code);
    const user = await getCurrentUser(tokenData.access_token);

    const session = signSession({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      token: tokenData.access_token,
      refresh: tokenData.refresh_token
    });

    res.cookie('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: config.cookieDomain,
      maxAge: 7 * 24 * 3600 * 1000
    });

    const redirectTo = process.env.POST_LOGIN_REDIRECT || 'http://localhost:3000/dashboard/index.html';
    return res.redirect(302, redirectTo);
  } catch (e) {
    console.error('Auth error:', e.response?.data || e.message);
    return res.status(500).send('Falha ao autenticar com Discord.');
  }
}

export async function me(req, res) {
  return res.json({ user: req.user });
}

export function logout(req, res) {
  res.clearCookie('session', { domain: config.cookieDomain });
  return res.json({ ok: true });
}
