import { Context, Markup } from 'telegraf';

export class ManagerButton {
  static async handle(ctx: Context) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('Свяжитесь с нашим менеджером:', Markup.inlineKeyboard([
      [Markup.button.url('💬 Написать менеджеру', 'https://t.me/BrahmaDzen')]
    ]));
  }
}

