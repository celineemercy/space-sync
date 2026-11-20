import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ListRoomsDto } from './dto/list-rooms.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list(@Query() filters: ListRoomsDto) {
    return this.rooms.list(filters);
  }

  @Get(':roomId')
  detail(@Param('roomId') roomId: string) {
    return this.rooms.detail(roomId);
  }
}
