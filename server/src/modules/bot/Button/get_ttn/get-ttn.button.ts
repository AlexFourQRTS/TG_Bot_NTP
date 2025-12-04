import { Context } from 'telegraf';
import { Markup } from 'telegraf';

export class GetTtnButton {
  static async handle(
    ctx: Context, 
    requestPhone: (ctx: Context, action: 'ttn' | 'receipt') => Promise<void>
  ) {
    const telegramId = ctx.from?.id?.toString();
    console.log(`[GetTtnButton] Starting handle for user: ${telegramId}`);
    await ctx.answerCbQuery();
    console.log(`[GetTtnButton] AnswerCbQuery done, deleting message`);
    await ctx.deleteMessage().catch((err) => {
      console.log(`[GetTtnButton] Error deleting message: ${err}`);
    });
    console.log(`[GetTtnButton] Calling requestPhone with action 'ttn'`);
    await requestPhone(ctx, 'ttn');
    console.log(`[GetTtnButton] requestPhone completed`);
  }
}

