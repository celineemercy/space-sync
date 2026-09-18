CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Room_capacity_check" CHECK ("capacity" > 0)
);

CREATE TABLE "Facility" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomFacility" (
  "roomId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  CONSTRAINT "RoomFacility_pkey" PRIMARY KEY ("roomId", "facilityId")
);

CREATE TABLE "ClassSchedule" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassSchedule_time_check" CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reservation_time_check" CHECK ("endsAt" > "startsAt")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE INDEX "Room_capacity_idx" ON "Room"("capacity");
CREATE UNIQUE INDEX "Facility_name_key" ON "Facility"("name");
CREATE INDEX "RoomFacility_facilityId_idx" ON "RoomFacility"("facilityId");
CREATE INDEX "ClassSchedule_roomId_startsAt_endsAt_idx" ON "ClassSchedule"("roomId", "startsAt", "endsAt");
CREATE INDEX "Reservation_roomId_startsAt_endsAt_status_idx" ON "Reservation"("roomId", "startsAt", "endsAt", "status");
CREATE INDEX "Reservation_userId_startsAt_idx" ON "Reservation"("userId", "startsAt");

ALTER TABLE "RoomFacility"
  ADD CONSTRAINT "RoomFacility_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomFacility"
  ADD CONSTRAINT "RoomFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSchedule"
  ADD CONSTRAINT "ClassSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
