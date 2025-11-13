/**
 * server.js
 *
 * Express backend with SQLite (better-sqlite3), bcrypt, JWT, and basic rate limiting.
 *
 * Endpoints:
 * POST /api/auth/register      { name, email, password }
 * POST /api/auth/login         { email, password }
 * POST /api/auth/verify-2fa    { userId, code }
 * POST /api/auth/forgot-password { email }
 * POST /api/auth/reset-password  { email, resetToken, newPassword }
 *
 * Notes:
 * - 2FA codes and reset tokens are single-use and stored in DB with short TTL semantics (not enforced by DB TTL).
 * - Replace console email with real SMTP via .env SMTP settings.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const PORT = process.env.PORT || 4000;
const DB_FILE = process.env.DATABASE_FILE || './data/db.sqlite';
const JWT_SECRET = process.env.JWT_SECRET || 'very-insecure-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';

// ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// open database
const db = new Database(DB_FILE);

// create users table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    two_fa_enabled INTEGER DEFAULT 1,
    two_fa_code TEXT,
    two_fa_expires INTEGER,
    reset_token TEXT,
    reset_expires INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
`).run();

// helper statements
const findUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUserStmt = db.prepare('INSERT INTO users (name, email, password_hash, two_fa_enabled) VALUES (?, ?, ?, ?)');
const set2FAStmt = db.prepare('UPDATE users SET two_fa_code = ?, two_fa_expires = ? WHERE id = ?');
const clear2FAStmt = db.prepare('UPDATE users SET two_fa_code = NULL, two_fa_expires = NULL WHERE id = ?');
const setResetStmt = db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?');
const clearResetStmt = db.prepare('UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE email = ?');
const updatePasswordStmt = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');

// nodemailer transporter (optional)
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465, // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  transporter = null;
}

// email helper (uses transporter if configured, otherwise logs to console)
async function sendEmail(to, subject, text) {
  if (transporter) {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || FROM_EMAIL,
      to,
      subject,
      text,
    });
    console.log(`Sent email to ${to} (${subject})`);
  } else {
    // fallback: console log (safe for local dev)
    console.log(`\n📧 [mock email] -> ${to}\nSubject: ${subject}\n\n${text}\n`);
  }
}

// JWT helper
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Express setup
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// basic rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: 'Too many requests, slow down.' }
});

app.use('/api/auth/', authLimiter);

// --- Routes --- //

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = findUserByEmailStmt.get(email);
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const info = insertUserStmt.run(name || null, email, hash, 1);

    // optional: send welcome email
    await sendEmail(email, 'Welcome!', `Hello ${name || ''}, your account has been created.`);

    return res.json({ ok: true, user: { id: info.lastInsertRowid, email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = findUserByEmailStmt.get(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // If 2FA enabled, generate a code and require verification
    if (user.two_fa_enabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // expires in 10 minutes (timestamp seconds)
      const expires = Math.floor(Date.now() / 1000) + 10 * 60;
      set2FAStmt.run(code, expires, user.id);
      await sendEmail(user.email, 'Your 2FA Code', `Your verification code is: ${code} (valid 10 minutes)`);
      return res.json({ twoFaRequired: true, user: { id: user.id, email: user.email } });
    }

    // otherwise return JWT
    const token = signToken({ sub: user.id, email: user.email });
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Verify 2FA
app.post('/api/auth/verify-2fa', (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: 'userId and code required' });

    const user = findUserByIdStmt.get(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = Math.floor(Date.now() / 1000);
    if (!user.two_fa_code || !user.two_fa_expires || user.two_fa_code !== code || user.two_fa_expires < now) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // clear pending 2FA and issue token
    clear2FAStmt.run(userId);
    const token = signToken({ sub: user.id, email: user.email });
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password (generate reset token)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = findUserByEmailStmt.get(email);
    if (!user) {
      // don't reveal whether email exists
      return res.json({ ok: true });
    }

    const token = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 48);
    // expires in 30 minutes
    const expires = Math.floor(Date.now() / 1000) + 30 * 60;
    setResetStmt.run(token, expires, email);
    await sendEmail(email, 'Password reset', `Use the following token to reset your password: ${token}. It expires in 30 minutes.`);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Reset password — exchange reset token for new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) return res.status(400).json({ message: 'Missing fields' });

    const user = findUserByEmailStmt.get(email);
    if (!user) return res.status(400).json({ message: 'Invalid token or email' });

    const now = Math.floor(Date.now() / 1000);
    if (!user.reset_token || user.reset_token !== resetToken || !user.reset_expires || user.reset_expires < now) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    updatePasswordStmt.run(hash, email);
    clearResetStmt.run(email);
    await sendEmail(email, 'Password changed', `Your password was successfully changed.`);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// small health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Auth server listening on http://localhost:${PORT}`);
});
