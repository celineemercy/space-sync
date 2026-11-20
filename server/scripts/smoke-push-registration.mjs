import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { JwtService } from '@nestjs/jwt';

const url = process.env.DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test') || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use an explicit local *_test database.');
if (!process.env.JWT_SECRET) throw new Error('Use the running test API JWT_SECRET.');
const db = new Client({ connectionString: url });
const base = process.env.SPACE_SYNC_API_URL ?? 'http://localhost:3000/api/v1';
const ids = [randomUUID(), randomUUID()];
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const sessions = ids.map((id) => jwt.sign({ sub: id, email: `${id}@example.test` }, { expiresIn: 3600 }));
const device = `ExponentPushToken[test-${randomUUID()}]`;
const replacement = `ExponentPushToken[test-${randomUUID()}]`;
function assert(ok, message) { if (!ok) throw new Error(message); }
async function request(method, session, token) {
  const response = await fetch(`${base}/auth/push-token`, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) }, body: JSON.stringify({ token }) });
  return response.status;
}
async function owner(id) { return (await db.query('SELECT "pushToken" FROM "User" WHERE "id"=$1', [id])).rows[0]?.pushToken; }
await db.connect();
try {
  for (const id of ids) await db.query('INSERT INTO "User" ("id","email","passwordHash","updatedAt") VALUES ($1,$2,$3,NOW())', [id, `${id}@example.test`, 'unused-for-JWT-smoke']);
  assert(await request('POST', sessions[0], device) === 201, 'Push registration failed');
  assert(await owner(ids[0]) === device, 'Token was not stored for authenticated user');
  assert(await request('POST', sessions[1], device) === 201, 'Token reassignment failed');
  assert(await owner(ids[0]) === null && await owner(ids[1]) === device, 'Device token leaked across accounts');
  assert(await request('POST', sessions[1], replacement) === 201, 'Replacement token registration failed');
  assert(await request('DELETE', sessions[1], device) === 200 && await owner(ids[1]) === replacement, 'Old token removed the replacement');
  assert(await request('DELETE', sessions[1], replacement) === 200 && await owner(ids[1]) === null, 'Logout did not remove registered token');
  assert(await request('POST', sessions[0], 'invalid-token') === 400, 'Invalid Expo token accepted');
  assert(await request('POST', null, device) === 401, 'Anonymous registration accepted');
  const expired = jwt.sign({ sub: ids[0], email: `${ids[0]}@example.test` }, { expiresIn: -1 });
  assert(await request('POST', expired, device) === 401, 'Expired session registered a token');
  console.log('Push registration smoke passed: authentication, reassignment, replacement protection, logout, invalid tokens and expired sessions. No push messages were sent.');
} finally {
  await db.query('DELETE FROM "User" WHERE "id" = ANY($1::text[])', [ids]);
  await db.end();
}
