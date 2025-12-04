import { Context } from 'telegraf';

export class AdminMenuButton {
  static async handle(
    ctx: Context,
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});

    const message = '👑 Панель администратора\n\nВыберите действие:';
    const { Markup } = require('telegraf');
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Рассылка сообщений', 'admin_broadcast')],
      [Markup.button.callback('⭐ Рассылка VIP', 'admin_broadcast_vip')],
      [Markup.button.callback('📊 Статистика', 'admin_statistics')],
    ]);

    await sendMessageWithCleanup(ctx, message, keyboard);
  }
}

