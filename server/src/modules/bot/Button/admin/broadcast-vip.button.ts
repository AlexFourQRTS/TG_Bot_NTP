import { Context } from 'telegraf';

export class BroadcastVipButton {
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

    const message = '⭐ Рассылка VIP пользователям\n\nВведите сообщение, которое хотите отправить VIP пользователям:';
    await sendMessageWithCleanup(ctx, message);
  }
}

