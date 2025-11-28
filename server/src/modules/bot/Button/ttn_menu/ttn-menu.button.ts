import { Context } from 'telegraf';

export class TtnMenuButton {
  static async handle(ctx: Context) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('Введите номер заказа для получения ТТН:');
  }
}

