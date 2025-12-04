import { Context } from 'telegraf';
import { StatisticsService } from '../../services/statistics.service';

export class StatisticsButton {
  static async handle(
    ctx: Context,
    statisticsService: StatisticsService,
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    await ctx.answerCbQuery();
    
    if (ctx.chat && ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && removeFromTracking) {
      const messageId = 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
      if (messageId) {
        removeFromTracking(ctx.chat.id, messageId);
      }
    }

    await ctx.deleteMessage().catch(() => {});

    try {
      const stats = await statisticsService.getStatistics();

      const message = `📊 Статистика

📈 Посещений за сегодня: ${stats.visitsToday}
👥 Всего пользователей: ${stats.totalUsers}
⭐ Всего VIP пользователей: ${stats.totalVipUsers}
🆕 Новых пользователей: ${stats.newUsers}
⭐ Новых VIP пользователей: ${stats.newVipUsers}`;

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Обновить', 'admin_statistics')],
        [Markup.button.callback('📥 Запросить данные у 1С', 'admin_1c_request')],
        [Markup.button.callback('⬅️ Назад', 'admin_menu')],
      ]);

      await sendMessageWithCleanup(ctx, message, keyboard);
    } catch (error) {
      await sendMessageWithCleanup(ctx, '❌ Ошибка при получении статистики');
    }
  }
}

