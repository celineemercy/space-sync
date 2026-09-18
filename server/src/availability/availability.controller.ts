import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('availability')
  search(@Query() query: AvailabilityQueryDto) {
    return this.availability.search(query);
  }
}
