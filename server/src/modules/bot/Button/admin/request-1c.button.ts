import { Context } from 'telegraf';
import { StatisticsService } from '../../services/statistics.service';

export class Request1CButton {
  static async handle(
    ctx: Context,
    statisticsService: StatisticsService,
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    await ctx.answerCbQuery('Запрос данных у 1С...');
    
    if (ctx.chat && ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && removeFromTracking) {
      const messageId = 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
      if (messageId) {
        removeFromTracking(ctx.chat.id, messageId);
      }
    }

    await ctx.deleteMessage().catch(() => {});

    try {
      await sendMessageWithCleanup(ctx, '⏳ Запрашиваю данные у 1С...');
      const result = await statisticsService.requestDataFrom1C();

      const message = `✅ ${result.message}\n\nДанные получены.`;

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Назад к статистике', 'admin_statistics')],
        [Markup.button.callback('⬅️ Назад в меню', 'admin_menu')],
      ]);

      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && 'message_id' in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.message_id
          : undefined,
        undefined,
        message,
        { reply_markup: keyboard.reply_markup }
      ).catch(() => {
        sendMessageWithCleanup(ctx, message, keyboard);
      });
    } catch (error) {
      await sendMessageWithCleanup(ctx, '❌ Ошибка при запросе данных у 1С');
    }
  }
}

