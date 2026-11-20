import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('document', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  create(@CurrentUser() user: AuthUser, @Body() input: CreateReservationDto, @UploadedFile() document?: Express.Multer.File) {
    return this.reservations.create(user, input, document);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.reservations.mine(user);
  }

  @Get('admin')
  adminList(@CurrentUser() user: AuthUser, @Query('status') status?: string, @Query('page') page?: string, @Query('date') date?: string) {
    return this.reservations.adminList(user, status, page, date);
  }

  @Get('admin/:reservationId')
  adminDetail(@CurrentUser() user: AuthUser, @Param('reservationId') id: string) {
    return this.reservations.adminDetail(user, id);
  }

  @Patch('admin/:reservationId/approve')
  approve(@CurrentUser() user: AuthUser, @Param('reservationId') id: string) {
    return this.reservations.decide(user, id, 'CONFIRMED');
  }

  @Patch('admin/:reservationId/reject')
  reject(@CurrentUser() user: AuthUser, @Param('reservationId') id: string, @Body() body: { reason?: string }) {
    return this.reservations.decide(user, id, 'REJECTED', body.reason);
  }

  @Get(':reservationId/document')
  async document(@CurrentUser() user: AuthUser, @Param('reservationId') id: string, @Res() response: Response) {
    const result = await this.reservations.document(user, id);
    response.setHeader('Content-Type', result.mime);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(result.bytes);
  }

  @Patch(':reservationId/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('reservationId') reservationId: string,
  ) {
    return this.reservations.cancel(user, reservationId);
  }
}
