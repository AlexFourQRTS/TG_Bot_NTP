import { Context } from 'telegraf';

export class TtnMenuButton {
  static async handle(
    ctx: Context, 
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});
    await sendMessageWithCleanup(ctx, '📦 Введите номер заказа для получения ТТН:\n\n📝 Просто отправьте номер заказа в следующем сообщении');
  }
}

