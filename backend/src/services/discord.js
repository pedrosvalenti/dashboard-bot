import axios from 'axios';
import { config } from '../config.js';

const base = config.discord.apiBase;

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri
  });
  const { data } = await axios.post(`${base}/oauth2/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
}

export async function refreshToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const { data } = await axios.post(`${base}/oauth2/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
}

export async function getCurrentUser(accessToken) {
  const { data } = await axios.get(`${base}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
}
