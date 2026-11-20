import { IsString, Matches, MaxLength } from 'class-validator';
export class PushTokenDto {
  @IsString()
  @MaxLength(512)
  @Matches(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/)
  token!: string;
}
