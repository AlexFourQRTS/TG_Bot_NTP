import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import { UsersModule } from '../users/users.module';
import { StatisticsService } from './services/statistics.service';
import { BroadcastService } from './services/broadcast.service';
import { MessageTrackingService } from './services/message-tracking.service';
import { BotConnectionService } from './services/bot-connection.service';
import { BotHandlers } from './handlers/bot-handlers';
import { BotInitializer } from './handlers/bot-initializer';
import { Visit } from '../../entities/visit.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Visit, User]),
  ],
  providers: [
    BotService,
    StatisticsService,
    BroadcastService,
    MessageTrackingService,
    BotConnectionService,
    BotHandlers,
    BotInitializer,
  ],
  exports: [BotService],
})
export class BotModule {}

