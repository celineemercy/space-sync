const baseUrl = process.env.SPACE_SYNC_API_URL ?? 'http://localhost:3000/api/v1';
const email = process.env.SEED_DEMO_EMAIL ?? 'student@example.test';
const password = process.env.SEED_DEMO_PASSWORD ?? 'SpaceSyncDemo123!';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request('/health');
assert(health.status === 200 && health.body?.status === 'ok', 'Health endpoint failed.');

const login = await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
assert(login.status === 201 && login.body?.accessToken, 'Demo login failed.');
const headers = { authorization: `Bearer ${login.body.accessToken}` };

const rooms = await request('/rooms', { headers });
assert(rooms.status === 200 && rooms.body?.length > 0, 'Room listing failed.');

const startsAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
startsAt.setUTCHours(2, 0, 0, 0);
const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
const query = new URLSearchParams({
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
});
const availability = await request(`/rooms/availability?${query}`, { headers });
assert(
  availability.status === 200 && availability.body?.rooms?.length > 0,
  'Availability search failed.',
);

const roomId = availability.body.rooms[0].id;
function reservationInput() {
  const body = new FormData();
  body.append('roomId', roomId);
  body.append('startsAt', startsAt.toISOString());
  body.append('endsAt', endsAt.toISOString());
  body.append('document', new Blob(['%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'], { type: 'application/pdf' }), 'permit.pdf');
  return body;
}

const attempts = await Promise.all([
  request('/reservations', { method: 'POST', headers, body: reservationInput() }),
  request('/reservations', { method: 'POST', headers, body: reservationInput() }),
]);
const successful = attempts.filter((attempt) => attempt.status === 201);
const conflicting = attempts.filter(
  (attempt) => attempt.status === 409 && attempt.body?.code === 'RESERVATION_CONFLICT',
);

try {
  assert(successful.length === 1, 'Concurrent reservation check did not create exactly one booking.');
  assert(conflicting.length === 1, 'Concurrent reservation check did not reject exactly one booking.');
  assert(successful[0].body?.status === 'PENDING', 'The new request is not awaiting approval.');

  const held = await request(`/rooms/availability?${query}`, { headers });
  assert(held.status === 200 && !held.body.rooms.some((room) => room.id === roomId), 'Pending reservation did not block availability.');
  const adjacentQuery = new URLSearchParams({ startsAt: endsAt.toISOString(), endsAt: new Date(endsAt.getTime() + 60_000).toISOString() });
  const adjacent = await request(`/rooms/availability?${adjacentQuery}`, { headers });
  assert(adjacent.status === 200 && adjacent.body.rooms.some((room) => room.id === roomId), 'Adjacent non-overlapping interval was incorrectly blocked.');

  // Only alter this smoke test's own reservation, using the CI/test database.
  if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) {
    const { Client } = await import('pg');
    const database = new Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      const now = new Date();
      const ongoingEnd = new Date(now.getTime() + 60_000);
      await database.query('UPDATE "Reservation" SET "startsAt" = $1, "endsAt" = $2 WHERE "id" = $3', [now.toISOString(), ongoingEnd.toISOString(), successful[0].body.id]);
      const ongoingQuery = new URLSearchParams({ startsAt: now.toISOString(), endsAt: ongoingEnd.toISOString() });
      const ongoing = await request(`/rooms/availability?${ongoingQuery}`, { headers });
      assert(ongoing.status === 200 && !ongoing.body.rooms.some((room) => room.id === roomId), 'Started pending reservation did not block availability.');
    } finally { await database.end(); }
  }

  const mine = await request('/reservations/mine', { headers });
  assert(
    mine.status === 200 && mine.body.some((item) => item.id === successful[0].body.id),
    'The new reservation was not returned by the current-user endpoint.',
  );
} finally {
  await Promise.all(
    successful.map((attempt) =>
      request(`/reservations/${attempt.body.id}/cancel`, { method: 'PATCH', headers }),
    ),
  );
}

console.log('space-sync API smoke test passed: health, login, rooms, availability, file upload, pending conflict, list, cancel.');
