import { Context, Markup } from 'telegraf';

export class InstagramButton {
  static async handle(
    ctx: Context, 
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});
    await sendMessageWithCleanup(ctx, '📷 Наш Instagram:\n\nПодписывайтесь на нас, чтобы быть в курсе всех новостей и акций! ✨', Markup.inlineKeyboard([
      [Markup.button.url('📷 Перейти в Instagram', 'https://www.instagram.com/')]
    ]));
  }
}

