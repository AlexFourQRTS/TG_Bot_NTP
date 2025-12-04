import { Context, Markup } from 'telegraf';
import { KeyboardType } from '../../../users/user.entity';

export class SettingsMenuButton {
  static async handle(
    ctx: Context,
    sendMessageWithCleanup: (ctx: Context, message: string, keyboard?: any) => Promise<any>,
    removeFromTracking?: (chatId: number, messageId: number) => void,
    currentKeyboardType?: KeyboardType
  ) {
    if (ctx.chat && ctx.message && 'message_id' in ctx.message && removeFromTracking) {
      removeFromTracking(ctx.chat.id, ctx.message.message_id);
    }
    await ctx.deleteMessage().catch(() => {});

    const keyboardType = currentKeyboardType || KeyboardType.REPLY;
    const currentTypeText = keyboardType === KeyboardType.REPLY ? 'Обычная' : 'Инлайн';
    
    const message = `⚙️ Настройки

Выберите тип клавиатуры:

Текущий тип: ${currentTypeText}
${keyboardType === KeyboardType.REPLY 
  ? '• Обычная - кнопки внизу экрана\n• Инлайн - кнопки под сообщением' 
  : '• Инлайн - кнопки под сообщением\n• Обычная - кнопки внизу экрана'}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          keyboardType === KeyboardType.REPLY ? '✅ Обычная' : 'Обычная',
          'settings_keyboard_reply'
        ),
        Markup.button.callback(
          keyboardType === KeyboardType.INLINE ? '✅ Инлайн' : 'Инлайн',
          'settings_keyboard_inline'
        )
      ],
      [Markup.button.callback('⬅️ Назад', 'menu_back')]
    ]);

    await sendMessageWithCleanup(ctx, message, keyboard);
  }
}

