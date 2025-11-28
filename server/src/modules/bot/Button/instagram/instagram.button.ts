import { Context, Markup } from 'telegraf';

export class InstagramButton {
  static async handle(ctx: Context) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('Наш Instagram:', Markup.inlineKeyboard([
      [Markup.button.url('📷 Перейти в Instagram', 'https://www.instagram.com/')]
    ]));
  }
}

