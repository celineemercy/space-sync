import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ReservationStatus } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed CampusSpace.');
}

const demoEmail = (process.env.SEED_DEMO_EMAIL ?? 'student@example.test').trim().toLowerCase();
const demoPassword = process.env.SEED_DEMO_PASSWORD;
if (!demoPassword || demoPassword.length < 10) {
  throw new Error('SEED_DEMO_PASSWORD must contain at least 10 characters.');
}
const seedPassword: string = demoPassword;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function nextWeekdayUtc(dayOfWeek: number, hour: number): Date {
  const value = new Date();
  value.setUTCHours(hour, 0, 0, 0);
  const daysAhead = ((dayOfWeek - value.getUTCDay() + 7) % 7) || 7;
  value.setUTCDate(value.getUTCDate() + daysAhead);
  return value;
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const passwordHash = await hash(seedPassword);
  const secondPasswordHash = await hash(`${seedPassword}-second`);

  const student = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash },
    create: { id: 'user-demo-student', email: demoEmail, passwordHash },
  });

  const secondStudent = await prisma.user.upsert({
    where: { email: 'second.student@example.test' },
    update: { passwordHash: secondPasswordHash },
    create: {
      id: 'user-demo-second',
      email: 'second.student@example.test',
      passwordHash: secondPasswordHash,
    },
  });

  const facilities = [
    ['facility-projector', 'Projector'],
    ['facility-whiteboard', 'Whiteboard'],
    ['facility-ac', 'Air Conditioning'],
    ['facility-power', 'Power Outlets'],
    ['facility-video', 'Video Conference'],
  ] as const;

  for (const [id, name] of facilities) {
    await prisma.facility.upsert({ where: { id }, update: { name }, create: { id, name } });
  }

  const rooms = [
    {
      id: 'room-a101',
      code: 'A-101',
      name: 'Discussion Room A101',
      location: 'Building A, Floor 1',
      capacity: 6,
      description: 'A compact room for small group discussions.',
      facilityIds: ['facility-whiteboard', 'facility-ac', 'facility-power'],
    },
    {
      id: 'room-a202',
      code: 'A-202',
      name: 'Collaboration Room A202',
      location: 'Building A, Floor 2',
      capacity: 12,
      description: 'A flexible collaboration room with presentation equipment.',
      facilityIds: ['facility-projector', 'facility-whiteboard', 'facility-ac', 'facility-power'],
    },
    {
      id: 'room-b105',
      code: 'B-105',
      name: 'Study Room B105',
      location: 'Building B, Floor 1',
      capacity: 4,
      description: 'A quiet room suited to focused study.',
      facilityIds: ['facility-whiteboard', 'facility-power'],
    },
    {
      id: 'room-b301',
      code: 'B-301',
      name: 'Seminar Room B301',
      location: 'Building B, Floor 3',
      capacity: 30,
      description: 'A larger room for seminars and organization meetings.',
      facilityIds: ['facility-projector', 'facility-whiteboard', 'facility-ac', 'facility-power', 'facility-video'],
    },
    {
      id: 'room-library-1',
      code: 'LIB-01',
      name: 'Library Group Room 1',
      location: 'Library, Floor 2',
      capacity: 8,
      description: 'A group study room near the main collection.',
      facilityIds: ['facility-whiteboard', 'facility-ac', 'facility-power'],
    },
    {
      id: 'room-library-2',
      code: 'LIB-02',
      name: 'Library Media Room',
      location: 'Library, Floor 2',
      capacity: 10,
      description: 'A media-enabled room for hybrid group activities.',
      facilityIds: ['facility-projector', 'facility-ac', 'facility-power', 'facility-video'],
    },
  ];

  for (const room of rooms) {
    const { facilityIds, ...data } = room;
    await prisma.room.upsert({ where: { id: room.id }, update: data, create: data });
    await prisma.roomFacility.deleteMany({ where: { roomId: room.id } });
    await prisma.roomFacility.createMany({
      data: facilityIds.map((facilityId) => ({ roomId: room.id, facilityId })),
    });
  }

  const mondayStart = nextWeekdayUtc(1, 2); // 09:00 Asia/Jakarta
  const tuesdayStart = nextWeekdayUtc(2, 6); // 13:00 Asia/Jakarta
  const schedules = [
    { id: 'schedule-a101', roomId: 'room-a101', title: 'Programming Fundamentals', startsAt: mondayStart, endsAt: addHours(mondayStart, 2) },
    { id: 'schedule-a202', roomId: 'room-a202', title: 'Database Systems', startsAt: tuesdayStart, endsAt: addHours(tuesdayStart, 2) },
    { id: 'schedule-b301', roomId: 'room-b301', title: 'Guest Lecture', startsAt: mondayStart, endsAt: addHours(mondayStart, 3) },
  ];

  for (const schedule of schedules) {
    await prisma.classSchedule.upsert({ where: { id: schedule.id }, update: schedule, create: schedule });
  }

  const reservationStart = nextWeekdayUtc(3, 3); // 10:00 Asia/Jakarta
  await prisma.reservation.upsert({
    where: { id: 'reservation-seeded-conflict' },
    update: {
      userId: secondStudent.id,
      roomId: 'room-library-1',
      startsAt: reservationStart,
      endsAt: addHours(reservationStart, 2),
      status: ReservationStatus.CONFIRMED,
      cancelledAt: null,
    },
    create: {
      id: 'reservation-seeded-conflict',
      userId: secondStudent.id,
      roomId: 'room-library-1',
      startsAt: reservationStart,
      endsAt: addHours(reservationStart, 2),
      status: ReservationStatus.CONFIRMED,
    },
  });

  console.info(`Seeded CampusSpace demo data for ${student.email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
