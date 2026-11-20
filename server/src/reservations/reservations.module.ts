import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { DocumentsService } from './documents.service.js';
import { AdminController } from './admin.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ReservationsController, AdminController],
  providers: [ReservationsService, DocumentsService],
})
export class ReservationsModule {}
