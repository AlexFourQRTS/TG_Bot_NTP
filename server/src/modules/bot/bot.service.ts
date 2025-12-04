import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { BotConnectionService } from './services/bot-connection.service';
import { BotInitializer } from './handlers/bot-initializer';
import { MessageTrackingService } from './services/message-tracking.service';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(BotService.name);
  private isBotRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionService: BotConnectionService,
    private readonly botInitializer: BotInitializer,
    private readonly messageTracking: MessageTrackingService,
  ) {}

  onModuleInit() {
    this.startBotWithReconnect();
  }

  onModuleDestroy() {
    this.connectionService.stopReconnectAttempts();
    this.connectionService.stopPeriodicCleanup();
    if (this.bot && this.isBotRunning) {
      this.connectionService.stopBot(this.bot).then(() => {
        this.isBotRunning = false;
      }).catch(() => {
        this.isBotRunning = false;
      });
    }
  }

  private async startBotWithReconnect() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not set');
      return;
    }

    if (this.bot && this.isBotRunning) {
      await this.connectionService.stopBot(this.bot);
      this.isBotRunning = false;
    }

    const result = await this.connectionService.startBot(
      token,
      async (bot: Telegraf) => {
        this.bot = bot;
        this.botInitializer.initialize(bot);
      },
      () => {
        this.handleConnectionLoss();
      },
      async () => {
        await this.periodicCleanup();
      }
    );

    if (result.isRunning && result.bot) {
      this.bot = result.bot;
      this.isBotRunning = true;
    }
  }

  private handleConnectionLoss() {
    if (this.isBotRunning) {
      this.isBotRunning = false;
      this.logger.warn('Bot connection lost, attempting to reconnect...');
    }

    this.connectionService.handleConnectionLoss(() => {
      return this.startBotWithReconnect();
    });
  }

  private async periodicCleanup(): Promise<void> {
    if (!this.isBotRunning || !this.bot) return;
    
    this.logger.debug('Running periodic cleanup of chat history...');
    await this.botInitializer.cleanupAllChats(this.bot);
  }

  async sendMessageToUser(telegramId: string, message: string): Promise<boolean> {
    if (!this.bot || !this.isBotRunning) {
      this.logger.warn('Bot is not running, cannot send message');
      return false;
    }

    try {
      const chatId = parseInt(telegramId, 10);
      if (isNaN(chatId)) {
        this.logger.error(`Invalid telegramId: ${telegramId}`);
        return false;
      }

      await this.bot.telegram.sendMessage(chatId, message);
      this.logger.log(`Message sent to user ${telegramId}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('chat not found') || 
          errorMessage.includes('bot was blocked') ||
          errorMessage.includes('user is deactivated')) {
        this.logger.warn(`Cannot send message to user ${telegramId}: ${errorMessage}`);
      } else {
        this.logger.error(`Failed to send message to user ${telegramId}:`, errorMessage);
      }
      return false;
    }
  }

  async sendMessageToUsers(telegramIds: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const telegramId of telegramIds) {
      const result = await this.sendMessageToUser(telegramId, message);
      if (result) {
        success++;
      } else {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return { success, failed };
  }
}
