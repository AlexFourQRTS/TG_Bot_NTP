import { Injectable } from '@nestjs/common';
import { BotService } from '../bot/bot.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class BroadcastService {
  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Отправляет сообщение всем пользователям
   * @param message - Текст сообщения для рассылки
   * @returns Результат рассылки
   */
  async broadcastToAll(message: string): Promise<{ success: number; failed: number; total: number }> {
    // Получаем всех пользователей с telegramId
    const users = await this.usersService.findAll();
    const usersWithTelegramId = users.filter(user => user.telegramId);
    
    const telegramIds = usersWithTelegramId.map(user => user.telegramId);
    
    const result = await this.botService.sendMessageToUsers(telegramIds, message);
    
    return {
      ...result,
      total: usersWithTelegramId.length,
    };
  }

  /**
   * Отправляет сообщение пользователям с определенной ролью
   * @param message - Текст сообщения
   * @param role - Роль пользователей (опционально)
   * @returns Результат рассылки
   */
  async broadcastToRole(message: string, role?: string): Promise<{ success: number; failed: number; total: number }> {
    const users = await this.usersService.findByRole(role);
    const usersWithTelegramId = users.filter(user => user.telegramId);
    
    const telegramIds = usersWithTelegramId.map(user => user.telegramId);
    
    const result = await this.botService.sendMessageToUsers(telegramIds, message);
    
    return {
      ...result,
      total: usersWithTelegramId.length,
    };
  }
}

