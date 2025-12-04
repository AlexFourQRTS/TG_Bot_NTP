import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotService } from '../bot/bot.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class BirthdayBroadcastService {
  private readonly logger = new Logger(BirthdayBroadcastService.name);

  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Находит пользователей, у которых сегодня день рождения
   * @returns Массив пользователей с днем рождения сегодня
   */
  async findUsersWithBirthdayToday(): Promise<User[]> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() возвращает 0-11
    const todayDay = today.getDate();

    const allUsers = await this.usersService.findAll();
    
    return allUsers.filter(user => {
      if (!user.birthday) return false;
      
      const birthday = new Date(user.birthday);
      const birthdayMonth = birthday.getMonth() + 1;
      const birthdayDay = birthday.getDate();
      
      return birthdayMonth === todayMonth && birthdayDay === todayDay;
    });
  }

  /**
   * Отправляет поздравление с днем рождения пользователям
   * @param customMessage - Кастомное сообщение (опционально)
   * @returns Результат рассылки
   */
  async sendBirthdayGreetings(customMessage?: string): Promise<{ success: number; failed: number; total: number }> {
    const usersWithBirthday = await this.findUsersWithBirthdayToday();
    
    if (usersWithBirthday.length === 0) {
      this.logger.log('No users with birthday today');
      return { success: 0, failed: 0, total: 0 };
    }

    const defaultMessage = '🎉🎂 Поздравляем с Днем Рождения! 🎂🎉\n\nЖелаем вам здоровья, счастья и успехов во всех начинаниях!';
    const message = customMessage || defaultMessage;

    const usersWithTelegramId = usersWithBirthday.filter(user => user.telegramId);
    const telegramIds = usersWithTelegramId.map(user => user.telegramId);

    const result = await this.botService.sendMessageToUsers(telegramIds, message);

    this.logger.log(`Birthday greetings sent: ${result.success} success, ${result.failed} failed out of ${usersWithTelegramId.length} users`);

    return {
      ...result,
      total: usersWithTelegramId.length,
    };
  }

  /**
   * Автоматическая рассылка поздравлений с днем рождения
   * Запускается каждый день в 9:00 утра
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleBirthdayBroadcast() {
    this.logger.log('Running automatic birthday broadcast...');
    await this.sendBirthdayGreetings();
  }
}

