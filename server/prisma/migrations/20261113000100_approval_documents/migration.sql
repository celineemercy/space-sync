CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');
ALTER TYPE "ReservationStatus" ADD VALUE 'PENDING';
ALTER TYPE "ReservationStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ReservationStatus" ADD VALUE 'EXPIRED';
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "Reservation"
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "decidedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "documentKey" TEXT,
  ADD COLUMN "documentName" TEXT,
  ADD COLUMN "documentMime" TEXT,
  ADD COLUMN "documentSize" INTEGER;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Reservation_status_startsAt_idx" ON "Reservation"("status", "startsAt");
