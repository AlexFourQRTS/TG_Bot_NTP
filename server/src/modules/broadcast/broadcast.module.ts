import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BroadcastController } from './broadcast.controller';
import { BroadcastService } from './broadcast.service';
import { BirthdayBroadcastService } from './birthday-broadcast.service';
import { BotModule } from '../bot/bot.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BotModule,
    UsersModule,
  ],
  controllers: [BroadcastController],
  providers: [
    BroadcastService,
    BirthdayBroadcastService,
  ],
})
export class BroadcastModule {}

