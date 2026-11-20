import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { ReservationsService } from './reservations.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly reservations: ReservationsService) {}
  @Get('stats')
  stats(@CurrentUser() user: AuthUser) { return this.reservations.adminStats(user); }
}
