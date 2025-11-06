import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signSession(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function authRequired(req, res, next) {
  const token = req.cookies?.session || (req.headers.authorization?.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}
