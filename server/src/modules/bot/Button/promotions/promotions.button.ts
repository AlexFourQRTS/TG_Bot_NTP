import { Context } from 'telegraf';

export class PromotionsButton {
  static async handle(
    ctx: Context, 
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});
    await sendMessageWithCleanup(ctx, '🎯 Раздел акций в разработке\n\nСкоро здесь будут доступны все текущие акции и специальные предложения! 🔥');
  }
}

