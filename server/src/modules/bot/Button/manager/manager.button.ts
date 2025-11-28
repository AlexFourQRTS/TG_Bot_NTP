import { Context, Markup } from 'telegraf';

export class ManagerButton {
  static async handle(
    ctx: Context, 
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});
    await sendMessageWithCleanup(ctx, '💬 Свяжитесь с нашим менеджером:\n\nНаш менеджер ответит на все ваши вопросы и поможет с выбором! 🤝', Markup.inlineKeyboard([
      [Markup.button.url('💬 Написать менеджеру', 'https://t.me/BrahmaDzen')]
    ]));
  }
}

