import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { User } from '../../users/user.entity';
import { Telegraf } from 'telegraf';

export interface BroadcastResult {
  success: number;
  failed: number;
  total: number;
}

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Рассылка сообщения всем пользователям
   */
  async broadcastToAll(bot: Telegraf, message: string): Promise<BroadcastResult> {
    const users = await this.usersRepository.find({
      where: { telegramId: Not(IsNull()) },
    });

    return this.sendMessages(bot, users, message);
  }

  /**
   * Рассылка сообщения только VIP пользователям
   */
  async broadcastToVip(bot: Telegraf, message: string): Promise<BroadcastResult> {
    const vipUsers = await this.usersRepository.find({
      where: { isVip: true },
    });

    return this.sendMessages(bot, vipUsers, message);
  }

  /**
   * Отправка сообщений пользователям
   */
  private async sendMessages(
    bot: Telegraf,
    users: User[],
    message: string,
  ): Promise<BroadcastResult> {
    let success = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.telegramId) {
        failed++;
        continue;
      }

      try {
        const chatId = parseInt(user.telegramId, 10);
        if (isNaN(chatId)) {
          this.logger.warn(`Invalid telegramId for user ${user.id}: ${user.telegramId}`);
          failed++;
          continue;
        }

        await bot.telegram.sendMessage(chatId, message);
        success++;

        // Небольшая задержка между отправками, чтобы не превысить rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        const errorMessage = error?.message || '';
        if (
          errorMessage.includes('chat not found') ||
          errorMessage.includes('bot was blocked') ||
          errorMessage.includes('user is deactivated')
        ) {
          this.logger.warn(`Cannot send message to user ${user.telegramId}: ${errorMessage}`);
        } else {
          this.logger.error(`Failed to send message to user ${user.telegramId}:`, errorMessage);
        }
        failed++;
      }
    }

    return {
      success,
      failed,
      total: users.length,
    };
  }
}

