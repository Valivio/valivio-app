import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const PROD = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1); // poprawna obsługa ciasteczek Secure za CDN/Proxy

// === Static: frontend & admin ===
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: PROD ? '1h' : 0,
  extensions: ['html']
}));
app.use('/admin', express.static(path.join(__dirname, 'admin'), { maxAge: 0 }));

// === Auth helpers ===
function sign(u) { return jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '7d' }); }
function requireAuth(req, res, next) {
  const token = req.cookies['valivio_token'];
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'unauthorized' }); }
}

// === Auth API ===
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  const token = sign(user);
  res.cookie('valivio_token', token, {
    httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 7*24*3600*1000
  });
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { res.clearCookie('valivio_token'); res.json({ ok: true }); });

// === Admin: slots CRUD (z walidacją i czytelnymi błędami) ===
app.post('/api/slots', requireAuth, async (req, res) => {
  try {
    let { date, time, duration } = req.body || {};
    duration = typeof duration === 'string' ? parseInt(duration, 10) : duration;

    if (!date || !time || !duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Podaj datę (YYYY-MM-DD), godzinę (HH:mm) i czas trwania w minutach (>0).'
      });
    }

    const start = DateTime.fromISO(`${date}T${time}`, { zone: 'Europe/Warsaw' });
    if (!start.isValid) {
      return res.status(400).json({ error: 'bad_request', message: 'Nieprawidłowa data lub godzina.' });
    }

    const startUTC = start.toUTC();
    const endUTC = startUTC.plus({ minutes: duration });

    const slot = await prisma.slot.create({
      data: { startAt: startUTC.toJSDate(), endAt: endUTC.toJSDate(), capacity: 1 }
    });

    return res.json({ ok: true, slot });
  } catch (e) {
    console.error('Create slot error:', e);
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'duplicate', message: 'Taki termin już istnieje.' });
    }
    return res.status(500).json({ error: 'server_error', message: 'Błąd serwera przy tworzeniu slotu.' });
  }
});

app.delete('/api/slots/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try { await prisma.slot.delete({ where: { id } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'not_found' }); }
});

app.get('/api/admin/slots', requireAuth, async (_req, res) => {
  const items = await prisma.slot.findMany({ orderBy: { startAt: 'asc' } });
  // Wyłącz cache po drodze (przeglądarka/CDN)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json(items);
});

// === Public: list slots & book ===
app.get('/api/slots', async (req, res) => {
  const { from, to } = req.query;
  const fromDT = from ? DateTime.fromISO(String(from), { zone: 'Europe/Warsaw' }).startOf('day').toUTC()
                      : DateTime.now().setZone('Europe/Warsaw').startOf('day').toUTC();
  const toDT   = to   ? DateTime.fromISO(String(to),   { zone: 'Europe/Warsaw' }).endOf('day').toUTC()
                      : fromDT.plus({ days: 21 });

  const slots = await prisma.slot.findMany({
    where: { startAt: { gte: fromDT.toJSDate(), lte: toDT.toJSDate() } },
    orderBy: { startAt: 'asc' },
    include: { bookings: true }
  });

  const available = slots.filter(s => s.bookings.length === 0);
  const map = {};
  for (const s of available) {
    const startPL = DateTime.fromJSDate(s.startAt, { zone: 'utc' }).setZone('Europe/Warsaw');
    const key = startPL.toFormat('yyyy-LL-dd');
    const time = startPL.toFormat('HH:mm');
    if (!map[key]) map[key] = [];
    map[key].push(time);
  }
  res.json({ timezone: 'Europe/Warsaw', slots: map });
});

app.post('/api/book', async (req, res) => {
  const { date, time, name, email } = req.body || {};
  if (!date || !time) return res.status(400).json({ error: 'bad_request' });
  const start = DateTime.fromISO(`${date}T${time}`, { zone: 'Europe/Warsaw' }).toUTC();
  const slot = await prisma.slot.findFirst({ where: { startAt: start.toJSDate() } });
  if (!slot) return res.status(404).json({ error: 'slot_not_found' });
  try {
    const booking = await prisma.booking.create({
      data: { slotId: slot.id, clientName: name || null, clientEmail: email || null, status: 'reserved' }
    });
    res.json({ ok: true, bookingId: booking.id });
  } catch {
    return res.status(409).json({ error: 'slot_taken' });
  }
});

// === Health ===
app.get('/healthz', (_req, res) => res.send('ok'));

// === Fallback (opcjonalnie) ===
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Listening on', PORT));
