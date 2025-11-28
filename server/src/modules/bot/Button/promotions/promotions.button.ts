import { Context } from 'telegraf';

export class PromotionsButton {
  static async handle(ctx: Context) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('Раздел акций в разработке');
  }
}

