import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { UsersService } from '../../users/users.service';
import { UserRole, KeyboardType } from '../../users/user.entity';
import { MessageTrackingService } from '../services/message-tracking.service';
import { BroadcastService } from '../services/broadcast.service';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotHandlers {
  private readonly logger = new Logger(BotHandlers.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly messageTracking: MessageTrackingService,
    private readonly broadcastService: BroadcastService,
  ) {}

  async handleStart(ctx: Context): Promise<void> {
    if (!ctx.from) return;

    const user = await this.usersService.createOrUpdate({
      telegramId: ctx.from.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    // Если у пользователя уже есть номер телефона, сразу показываем главное меню
    let hasPhone = false;
    if (user && user.phone) {
      const phoneTrimmed = user.phone.toString().trim();
      hasPhone = phoneTrimmed.length > 0;
    }
    if (hasPhone) {
      await this.showMainMenu(ctx);
      return;
    }

    // Если номера нет - показываем "замануху" с кнопками для получения ТТН и чека
    const isAdmin = user.role === UserRole.ADMIN;
    const keyboardType = user.keyboardType || KeyboardType.REPLY;
    
    const message = `👋 Добро пожаловать, ${user.firstName || 'Пользователь'}! 🎉

${isAdmin ? '👑 Ваша роль: Администратор' : '👤 Ваша роль: Пользователь'}

Выберите действие:`;

    const menuItems = [
      ['📦 Получить ТТН', 'get_ttn'],
      ['🧾 Получить чек', 'get_receipt'],
    ];

    if (isAdmin) {
      menuItems.push(['👑 Админка', 'admin_menu']);
    }

    let keyboard;
    if (keyboardType === KeyboardType.INLINE) {
      const keyboardRows = menuItems.map(item => [Markup.button.callback(item[0], item[1])]);
      keyboard = Markup.inlineKeyboard(keyboardRows);
    } else {
      const keyboardRows = menuItems.map(item => [item[0]]);
      if (isAdmin) {
        keyboardRows.push(['👑 Админка']);
      }
      keyboard = Markup.keyboard(keyboardRows).resize();
    }

    await this.messageTracking.sendMessageWithCleanup(ctx, message, keyboard);
  }

  async handleContact(ctx: Context, pendingAction?: 'ttn' | 'receipt' | null): Promise<void> {
    if (!ctx.from || !ctx.message || !('contact' in ctx.message)) {
      return;
    }

    const contact = ctx.message.contact;
    const telegramId = ctx.from.id.toString();

    const userData: any = {
      telegramId,
      phone: contact.phone_number,
    };

    if (ctx.from.username) {
      userData.username = ctx.from.username;
    }
    if (ctx.from.first_name) {
      userData.firstName = ctx.from.first_name;
    }
    if (ctx.from.last_name) {
      userData.lastName = ctx.from.last_name;
    }

    await this.usersService.createOrUpdate(userData);

    // Если есть ожидаемое действие, продолжаем процесс
    if (pendingAction) {
      if (pendingAction === 'ttn') {
        await this.messageTracking.sendMessageWithCleanup(
          ctx,
          '📦 Введите номер заказа для получения ТТН:\n\n📝 Просто отправьте номер заказа в следующем сообщении'
        );
      } else if (pendingAction === 'receipt') {
        await this.messageTracking.sendMessageWithCleanup(
          ctx,
          '🧾 Введите номер заказа для получения чека:\n\n📝 Просто отправьте номер заказа в следующем сообщении'
        );
      }
    } else {
      // Если действия нет, показываем главное меню
      await this.showMainMenu(ctx);
    }
  }

  async showMainMenu(ctx: Context): Promise<void> {
    if (!ctx.from) return;
    
    const user = await this.usersService.findOne(ctx.from.id.toString());
    if (!user) return;

    const isAdmin = user.role === UserRole.ADMIN;
    const keyboardType = user.keyboardType || KeyboardType.REPLY;

    const menuItems = [
      ['📦 ТТН', 'menu_ttn'],
      ['🧾 Чек', 'menu_receipt'],
      ['🎁 Бонусы', 'menu_bonuses'],
      ['🎯 Акции', 'menu_promotions'],
      ['📷 Инстаграмм', 'menu_instagram'],
      ['💬 Менеджер', 'menu_manager']
    ];

    if (isAdmin) {
      menuItems.push(['👑 Админка', 'admin_menu']);
    }

    menuItems.push(['🚀 Старт', 'menu_start']);
    menuItems.push(['⚙️ Настройки', 'menu_settings']);

    let keyboard;
    if (keyboardType === KeyboardType.INLINE) {
      const keyboardRows = menuItems.map(item => [Markup.button.callback(item[0], item[1])]);
      keyboard = Markup.inlineKeyboard(keyboardRows);
    } else {
      const keyboardRows: string[][] = [
        ['📦 ТТН', '🧾 Чек', '🎁 Бонусы'],
        ['🎯 Акции', '📷 Инстаграмм', '💬 Связаться с Менеджером']
      ];

      if (isAdmin) {
        keyboardRows.push(['👑 Админка', '🚀 Старт', '⚙️ Настройки']);
      } else {
        keyboardRows.push(['🚀 Старт', '⚙️ Настройки']);
      }
      
      keyboard = Markup.keyboard(keyboardRows).resize();
    }

    await this.messageTracking.sendMessageWithCleanup(ctx, '👋 Выберите действие:', keyboard);
  }

  async requestPhone(ctx: Context, action: 'ttn' | 'receipt'): Promise<void> {
    const telegramId = ctx.from?.id?.toString();
    this.logger.log(`[requestPhone] Action: ${action}, TelegramId: ${telegramId}`);

    if (!ctx.from) {
      this.logger.warn(`[requestPhone] No ctx.from found for action: ${action}`);
      return;
    }

    // Создаем/обновляем пользователя перед проверкой телефона
    this.logger.log(`[requestPhone] Creating/updating user: ${telegramId}`);
    await this.usersService.createOrUpdate({
      telegramId: telegramId!,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    // Получаем пользователя из БД после обновления
    const user = await this.usersService.findOne(telegramId!);
    this.logger.log(`[requestPhone] User found: ${!!user}, User phone: ${user?.phone || 'null/undefined'}`);
    
    // Проверяем, есть ли у пользователя номер телефона
    // Проверяем на null, undefined, пустую строку и строку из пробелов
    let hasPhone = false;
    if (user && user.phone) {
      const phoneTrimmed = user.phone.toString().trim();
      hasPhone = phoneTrimmed.length > 0;
      this.logger.log(`[requestPhone] Phone trimmed: "${phoneTrimmed}", hasPhone: ${hasPhone}`);
    } else {
      this.logger.log(`[requestPhone] No phone found or user is null`);
    }
    
    // Если у пользователя уже есть номер телефона, переходим к следующему шагу
    if (hasPhone) {
      this.logger.log(`[requestPhone] User has phone, proceeding to next step for action: ${action}`);
      if (action === 'ttn') {
        await this.messageTracking.sendMessageWithCleanup(
          ctx,
          '📦 Введите номер заказа для получения ТТН:\n\n📝 Просто отправьте номер заказа в следующем сообщении'
        );
      } else {
        await this.messageTracking.sendMessageWithCleanup(
          ctx,
          '🧾 Введите номер заказа для получения чека:\n\n📝 Просто отправьте номер заказа в следующем сообщении'
        );
      }
      return;
    }

    // Запрашиваем номер телефона только если его нет
    this.logger.log(`[requestPhone] Requesting phone number for action: ${action}`);
    const message = action === 'ttn' 
      ? '📦 Для получения ТТН необходимо поделиться номером телефона\n\n🔐 Ваши данные защищены и используются только для поиска ваших заказов'
      : '🧾 Для получения чека необходимо поделиться номером телефона\n\n🔐 Ваши данные защищены и используются только для поиска ваших заказов';

    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Поделиться номером телефона')]
    ]).resize();

    this.logger.log(`[requestPhone] Sending message with phone request keyboard`);
    await this.messageTracking.sendMessageWithCleanup(ctx, message, keyboard);
    this.logger.log(`[requestPhone] Message sent successfully`);
  }

  async handleAdminBroadcast(
    ctx: Context,
    bot: Telegraf,
    type: 'all' | 'vip',
    message: string
  ): Promise<void> {
    if (!ctx.from || !bot) return;

    await ctx.deleteMessage().catch(() => {});
    
    const statusMessage = await this.messageTracking.sendMessageWithCleanup(
      ctx,
      type === 'all' 
        ? '⏳ Начинаю рассылку сообщения всем пользователям...'
        : '⏳ Начинаю рассылку сообщения VIP пользователям...'
    );

    try {
      const result = type === 'all'
        ? await this.broadcastService.broadcastToAll(bot, message)
        : await this.broadcastService.broadcastToVip(bot, message);

      const resultMessage = `${type === 'all' ? '📢' : '⭐'} Рассылка завершена!

✅ Успешно отправлено: ${result.success}
❌ Ошибок: ${result.failed}
📊 Всего получателей: ${result.total}`;

      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        statusMessage.message_id,
        undefined,
        resultMessage
      ).catch(() => {
        this.messageTracking.sendMessageWithCleanup(ctx, resultMessage);
      });
    } catch (error: any) {
      const errorMessage = `❌ Ошибка при рассылке: ${error?.message || 'Неизвестная ошибка'}`;
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        statusMessage.message_id,
        undefined,
        errorMessage
      ).catch(() => {
        this.messageTracking.sendMessageWithCleanup(ctx, errorMessage);
      });
    }
  }

  async showSettings(ctx: Context): Promise<void> {
    if (!ctx.from) return;

    const user = await this.usersService.findOne(ctx.from.id.toString());
    if (!user) return;

    const keyboardType = user.keyboardType || KeyboardType.REPLY;
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

    await this.messageTracking.sendMessageWithCleanup(ctx, message, keyboard);
  }

  async updateKeyboardType(ctx: Context, keyboardType: KeyboardType): Promise<void> {
    if (!ctx.from) return;

    await this.usersService.setKeyboardType(ctx.from.id.toString(), keyboardType);
    
    const typeText = keyboardType === KeyboardType.REPLY ? 'обычная' : 'инлайн';
    await ctx.answerCbQuery(`Тип клавиатуры изменен на: ${typeText}`);
    
    await this.showMainMenu(ctx);
  }
}

