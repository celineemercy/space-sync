const baseUrl = process.env.CAMPUSSPACE_API_URL ?? 'http://localhost:3000/api/v1';
const email = process.env.SEED_DEMO_EMAIL ?? 'student@example.test';
const password = process.env.SEED_DEMO_PASSWORD ?? 'CampusSpaceDemo123!';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
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
const reservationInput = JSON.stringify({
  roomId,
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
});

const attempts = await Promise.all([
  request('/reservations', { method: 'POST', headers, body: reservationInput }),
  request('/reservations', { method: 'POST', headers, body: reservationInput }),
]);
const successful = attempts.filter((attempt) => attempt.status === 201);
const conflicting = attempts.filter(
  (attempt) => attempt.status === 409 && attempt.body?.code === 'RESERVATION_CONFLICT',
);

try {
  assert(successful.length === 1, 'Concurrent reservation check did not create exactly one booking.');
  assert(conflicting.length === 1, 'Concurrent reservation check did not reject exactly one booking.');

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

console.log('CampusSpace API smoke test passed: health, login, rooms, availability, concurrency, list, cancel.');
