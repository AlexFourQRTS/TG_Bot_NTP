import { Context } from 'telegraf';

export class BonusesButton {
  static async handle(ctx: Context) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('Раздел бонусов в разработке');
  }
}

