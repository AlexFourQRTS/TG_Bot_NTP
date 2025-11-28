import { Context } from 'telegraf';
import { Markup } from 'telegraf';

export class GetReceiptButton {
  static async handle(
    ctx: Context, 
    requestPhone: (ctx: Context, action: 'ttn' | 'receipt') => Promise<void>
  ) {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    await requestPhone(ctx, 'receipt');
  }
}

