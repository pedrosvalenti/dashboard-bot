import { pool } from '../db.js';
import axios from 'axios';
import { config } from '../config.js';

const base = config.discord.apiBase;

function hasAdmin(perm) {
  try {
    const b = BigInt(perm);
    return (b & BigInt(0x8)) === BigInt(0x8);
  } catch {
    return false;
  }
}

export async function listGuilds(req, res) {
  try {
    const { token } = req.user;
    const { data: guilds } = await axios.get(`${base}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const adminGuilds = guilds.filter(g => hasAdmin(g.permissions));
    res.json(adminGuilds);
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: 'Falha ao listar servidores' });
  }
}

export async function getGuildStats(req, res) {
  try {
    const guildId = req.params.guildId;

    // Se não definir BOT_TOKEN, retorna valores padrão para não quebrar
    if (!process.env.BOT_TOKEN) {
      return res.json({
        guild: { id: guildId, name: 'Servidor', icon: null },
        stats: {
          members: 0,
          online_members: 0,
          text_channels: 0,
          voice_channels: 0,
          commands: 0,
          uptime: '—'
        }
      });
    }

    const { default: axios } = await import('axios');
    const base = "https://discord.com/api/v10";

    // Guild + contagens aproximadas
    const { data: guild } = await axios.get(`${base}/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });

    // Lista canais
    const { data: channels } = await axios.get(`${base}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });

    const text_channels = channels.filter(c => c.type === 0).length; // texto
    const voice_channels = channels.filter(c => c.type === 2).length; // voz

    // Assuming your bot has an API endpoint for stats
    let uptime = '—';
    try {
      const { data: botStats } = await axios.get(`${config.bot.apiUrl}/stats`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
      });
      uptime = botStats.uptime;
    } catch (err) {
      uptime = "Error"
      console.warn('Failed to fetch bot uptime:', err.message);
    }

    const stats = {
      members: guild.approximate_member_count ?? 0,
      online_members: guild.approximate_presence_count ?? 0,
      // channels: channels.length ?? 0,
      channels: text_channels + voice_channels ?? 0,
      text_channels: text_channels ?? 0,
      voice_channels: voice_channels ?? 0,
      commands: 0,
      uptime
    };

    return res.json({
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon
      },
      stats
    });

  } catch (e) {
    console.error('[getGuildStats]', e.response?.data || e.message);
    return res.status(500).json({ error: 'Falha ao obter estatísticas' });
  }
}

export async function getSettings(req, res) {
  const guildId = req.params.guildId;
  const [rows] = await pool.query(
    "SELECT guild_id, prefix, log_channel_id, language, created_at, updated_at FROM guild_settings WHERE guild_id = ?",
    [guildId]
  );
  if (rows.length === 0) {
    return res.json({ guild_id: guildId, prefix: '!', log_channel_id: null, language: 'pt-BR' });
  }
  res.json(rows[0]);
}

export async function updateSettings(req, res) {
  const guildId = req.params.guildId;
  const { prefix, log_channel_id, language } = req.body || {};
  await pool.query(
    "INSERT INTO guild_settings (guild_id, prefix, log_channel_id, language) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE prefix = VALUES(prefix), log_channel_id = VALUES(log_channel_id), language = VALUES(language)",
    [guildId, prefix || '!', log_channel_id || null, language || 'pt-BR']
  );
  res.json({ ok: true });
}
