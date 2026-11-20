import { randomUUID } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { Client } from 'pg';
const url = process.env.DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test') || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use an explicit local *_test database.');
const base = process.env.SPACE_SYNC_API_URL ?? 'http://localhost:3000/api/v1';
const db = new Client({ connectionString: url });
const id = randomUUID();
const roomId = randomUUID();
const email = `admin-${id}@example.test`;
const password = randomUUID();
const pendingId = randomUUID();
const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const midnight = new Date(`${today}T00:00:00+07:00`);
const week = new Date(`${today}T00:00:00Z`);
week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
const weekStart = new Date(`${week.toISOString().slice(0, 10)}T12:00:00+07:00`);
function assert(ok, message) { if (!ok) throw new Error(message); }
async function request(path, token, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return { status: response.status, body: await response.json() };
}
await db.connect();
try {
  await db.query('INSERT INTO "User" ("id","email","passwordHash","role","updatedAt") VALUES ($1,$2,$3,\'ADMIN\',NOW())', [id, email, await hash(password)]);
  await db.query('INSERT INTO "Room" ("id","code","name","location","capacity","updatedAt") VALUES ($1,$2,\'Dashboard smoke room\',\'Test\',8,NOW())', [roomId, `TEST-${id}`]);
  await db.query('INSERT INTO "Reservation" ("id","userId","roomId","startsAt","endsAt","status","updatedAt") VALUES ($1,$2,$3,$4,$5,\'PENDING\',NOW())', [pendingId, id, roomId, new Date(midnight.getTime()+3_600_000).toISOString(), new Date(midnight.getTime()+90_000_000).toISOString()]);
  for (let i=0;i<3;i++) await db.query('INSERT INTO "Reservation" ("id","userId","roomId","startsAt","endsAt","status","updatedAt") VALUES ($1,$2,$3,$4,$5,\'CONFIRMED\',NOW())', [randomUUID(), id, roomId, new Date(weekStart.getTime()+i*3_600_000).toISOString(), new Date(weekStart.getTime()+(i+1)*3_600_000).toISOString()]);
  const login = await request('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  assert(login.status === 201, 'Admin login failed');
  const token = login.body.accessToken;
  const stats = await request('/admin/stats', token);
  assert(stats.status === 200 && stats.body.pendingToday >= 1 && stats.body.confirmedThisWeek >= 3 && stats.body.busiestRoom.id === roomId, 'Dashboard aggregate mismatch');
  const filtered = await request(`/reservations/admin?status=PENDING&date=${today}`, token);
  assert(filtered.status === 200 && filtered.body.items.some(item => item.id === pendingId), 'Date/status filter failed');
  const invalidDate = await request('/reservations/admin?date=2026-02-30', token);
  assert(invalidDate.status === 400, 'Invalid date accepted');
  const noReason = await request(`/reservations/admin/${pendingId}/reject`, token, { method: 'PATCH', body: '{}' });
  assert(noReason.status === 400, 'Blank rejection reason accepted');
  const approved = await request(`/reservations/admin/${pendingId}/approve`, token, { method: 'PATCH', body: '{}' });
  assert(approved.status === 200 && approved.body.status === 'CONFIRMED', 'Inline approval API failed');
  const anonymous = await request('/admin/stats');
  assert(anonymous.status === 401, 'Anonymous stats access allowed');
  console.log('Admin smoke passed: stats, date/status filters, invalid dates, approval, required rejection reason, authentication.');
} finally {
  await db.query('DELETE FROM "Reservation" WHERE "roomId"=$1', [roomId]);
  await db.query('DELETE FROM "Room" WHERE "id"=$1', [roomId]);
  await db.query('DELETE FROM "User" WHERE "id"=$1', [id]);
  await db.end();
}
