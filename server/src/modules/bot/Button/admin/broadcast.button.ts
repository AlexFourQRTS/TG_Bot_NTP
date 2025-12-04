import { Context } from 'telegraf';

export class BroadcastButton {
  static async handle(
    ctx: Context,
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

    const message = '📢 Рассылка сообщений\n\nВведите сообщение, которое хотите отправить всем пользователям:';
    await sendMessageWithCleanup(ctx, message);

    // Сохраняем состояние ожидания сообщения для рассылки
    if (ctx.from) {
      // Можно использовать Map или БД для хранения состояния
      // Для простоты будем использовать простой механизм
    }
  }
}

