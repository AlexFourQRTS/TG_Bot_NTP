import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotConnectionService {
  private readonly logger = new Logger(BotConnectionService.name);
  private reconnectInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY = 5000;
  private readonly CLEANUP_INTERVAL = 30000;
  private isReconnecting = false;

  async startBot(
    token: string,
    onStart: (bot: Telegraf) => Promise<void>,
    onError: () => void,
    onCleanup: () => Promise<void>
  ): Promise<{ bot: Telegraf; isRunning: boolean }> {
    if (this.isReconnecting) {
      this.logger.debug('Reconnection already in progress, skipping...');
      return { bot: null as any, isRunning: false };
    }

    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not set');
      return { bot: null as any, isRunning: false };
    }

    this.isReconnecting = true;

    try {
      const bot = new Telegraf(token);
      
      bot.catch((err, ctx) => {
        this.logger.error('Bot error occurred', err);
        const error = err as any;
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        
        if (errorMessage.includes('fetch') || 
            errorMessage.includes('ECONNREFUSED') || 
            errorMessage.includes('ETIMEDOUT') ||
            errorMessage.includes('network') ||
            errorCode === 'ECONNREFUSED' ||
            errorCode === 'ETIMEDOUT') {
          onError();
        }
      });

      await onStart(bot);
      await bot.launch();
      
      this.isReconnecting = false;
      this.logger.log('Bot started successfully');
      
      this.stopReconnectAttempts();
      this.startPeriodicCleanup(onCleanup);

      return { bot, isRunning: true };
    } catch (error) {
      this.isReconnecting = false;
      this.logger.error('Failed to start bot', error);
      onError();
      return { bot: null as any, isRunning: false };
    }
  }

  handleConnectionLoss(onReconnect: () => Promise<void>): void {
    this.logger.warn('Bot connection lost, attempting to reconnect...');
    this.stopReconnectAttempts();

    this.reconnectInterval = setInterval(() => {
      this.logger.log('Attempting to reconnect bot...');
      onReconnect().catch((err) => {
        this.logger.error('Reconnection attempt failed', err);
      });
    }, this.RECONNECT_DELAY);
  }

  stopReconnectAttempts(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private startPeriodicCleanup(onCleanup: () => Promise<void>): void {
    this.stopPeriodicCleanup();
    
    this.cleanupInterval = setInterval(async () => {
      await onCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async stopBot(bot: Telegraf): Promise<void> {
    if (bot) {
      try {
        await bot.stop('SIGINT');
      } catch (error) {
        // Игнорируем ошибки при остановке
      }
    }
  }
}

