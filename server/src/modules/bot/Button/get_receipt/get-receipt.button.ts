import { Context } from 'telegraf';
import { Markup } from 'telegraf';

export class GetReceiptButton {
  static async handle(
    ctx: Context, 
    requestPhone: (ctx: Context, action: 'ttn' | 'receipt') => Promise<void>
  ) {
    const telegramId = ctx.from?.id?.toString();
    console.log(`[GetReceiptButton] Starting handle for user: ${telegramId}`);
    await ctx.answerCbQuery();
    console.log(`[GetReceiptButton] AnswerCbQuery done, deleting message`);
    await ctx.deleteMessage().catch((err) => {
      console.log(`[GetReceiptButton] Error deleting message: ${err}`);
    });
    console.log(`[GetReceiptButton] Calling requestPhone with action 'receipt'`);
    await requestPhone(ctx, 'receipt');
    console.log(`[GetReceiptButton] requestPhone completed`);
  }
}

