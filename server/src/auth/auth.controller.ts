import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from './auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PushTokenDto } from '../notifications/push-token.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly notifications: NotificationsService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  registerPush(@CurrentUser() user: AuthUser, @Body() input: PushTokenDto) {
    return this.notifications.register(user, input.token);
  }

  @Delete('push-token')
  @UseGuards(JwtAuthGuard)
  removePush(@CurrentUser() user: AuthUser, @Body() input: PushTokenDto) {
    return this.notifications.remove(user, input.token);
  }
}
