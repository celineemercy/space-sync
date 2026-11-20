ALTER TABLE "User" ADD COLUMN "pushToken" TEXT, ADD COLUMN "pushTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_pushToken_key" ON "User"("pushToken");
