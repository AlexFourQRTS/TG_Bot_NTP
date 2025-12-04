import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';
import { GetTtnButton } from './Button/get_ttn/get-ttn.button';
import { GetReceiptButton } from './Button/get_receipt/get-receipt.button';
import { TtnMenuButton } from './Button/ttn_menu/ttn-menu.button';
import { ReceiptMenuButton } from './Button/receipt_menu/receipt-menu.button';
import { BonusesButton } from './Button/bonuses/bonuses.button';
import { PromotionsButton } from './Button/promotions/promotions.button';
import { InstagramButton } from './Button/instagram/instagram.button';
import { ManagerButton } from './Button/manager/manager.button';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;
  private readonly logger = new Logger(BotService.name);
  private chatMessages: Map<number, number[]> = new Map(); // chatId -> messageId[]
  private chatHistoryLoaded: Map<number, boolean> = new Map(); // chatId -> isHistoryLoaded
  private readonly MAX_MESSAGES = 4;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY = 5000; // 5 секунд
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30000; // 30 секунд
  private isBotRunning = false;
  private isReconnecting = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    this.startBotWithReconnect();
  }

  onModuleDestroy() {
    this.stopReconnectAttempts();
    this.stopPeriodicCleanup();
    if (this.bot && this.isBotRunning) {
      try {
        this.bot.stop('SIGINT');
      } catch (error) {
        // Игнорируем ошибки при остановке
      }
      this.isBotRunning = false;
    }
  }

  private async startBotWithReconnect() {
    // Предотвращаем одновременные попытки переподключения
    if (this.isReconnecting) {
      this.logger.debug('Reconnection already in progress, skipping...');
      return;
    }

    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not set');
      return;
    }

    this.isReconnecting = true;

    try {
      // Останавливаем предыдущий экземпляр, если он существует
      if (this.bot && this.isBotRunning) {
        try {
          await this.bot.stop('SIGINT');
        } catch (error) {
          // Игнорируем ошибки при остановке
        }
        this.isBotRunning = false;
      }

      this.bot = new Telegraf(token);
      this.initializeBot();
      
      // Обработка ошибок соединения
      this.bot.catch((err, ctx) => {
        this.logger.error('Bot error occurred', err);
        const error = err as any;
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        
        if (errorMessage.includes('fetch') || 
            errorMessage.includes('ECONNREFUSED') || 
            errorMessage.includes('ETIMEDOUT') ||
            errorMessage.includes('network') ||
            errorCode === 'ECONNREFUSED' ||
            errorCode === 'ETIMEDOUT') {
          this.handleConnectionLoss();
        }
      });

      await this.bot.launch();
      this.isBotRunning = true;
      this.isReconnecting = false;
      this.logger.log('Bot started successfully');
      
      // Останавливаем попытки переподключения, если они были активны
      this.stopReconnectAttempts();
      
      // Запускаем периодическую очистку истории чатов
      this.startPeriodicCleanup();

    } catch (error) {
      this.isReconnecting = false;
      this.logger.error('Failed to start bot', error);
      this.handleConnectionLoss();
    }
  }

  private handleConnectionLoss() {
    if (this.isBotRunning) {
      this.isBotRunning = false;
      this.logger.warn('Bot connection lost, attempting to reconnect...');
    }

    // Останавливаем предыдущие попытки переподключения
    this.stopReconnectAttempts();

    // Запускаем переподключение каждые 5 секунд
    this.reconnectInterval = setInterval(() => {
      if (!this.isBotRunning && !this.isReconnecting) {
        this.logger.log('Attempting to reconnect bot...');
        this.startBotWithReconnect().catch((err) => {
          this.logger.error('Reconnection attempt failed', err);
        });
      }
    }, this.RECONNECT_DELAY);
  }

  private stopReconnectAttempts() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private startPeriodicCleanup() {
    // Останавливаем предыдущий интервал, если он был
    this.stopPeriodicCleanup();
    
    // Запускаем периодическую очистку истории всех чатов
    this.cleanupInterval = setInterval(async () => {
      if (!this.isBotRunning || !this.bot) return;
      
      this.logger.debug('Running periodic cleanup of chat history...');
      
      // Очищаем историю для всех чатов
      for (const [chatId, messages] of this.chatMessages.entries()) {
        if (messages.length > this.MAX_MESSAGES) {
          try {
            // Создаем контекст для очистки
            const fakeCtx = {
              chat: { id: chatId },
              telegram: this.bot.telegram,
            } as any;
            
            await this.cleanupOldMessages(fakeCtx, chatId);
          } catch (error: any) {
            this.logger.warn(`Failed to cleanup chat ${chatId}:`, error?.message);
          }
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  private stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private initializeBot() {
    // Используем middleware для отслеживания всех сообщений (включая команды)
    this.bot.use(async (ctx, next) => {
      // Загружаем историю чата при первом взаимодействии
      if (ctx.chat && !this.chatHistoryLoaded.get(ctx.chat.id)) {
        await this.loadChatHistory(ctx);
        this.chatHistoryLoaded.set(ctx.chat.id, true);
      }
      
      // Отслеживаем все сообщения перед обработкой
      if (ctx.message && 'message_id' in ctx.message) {
        await this.trackMessage(ctx);
      }
      return next();
    });

    // Обработчик команды /start
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // Обработчики кнопок - запрашивают телефон
    this.bot.action('get_ttn', async (ctx) => {
      // Удаляем сообщение с inline кнопками из отслеживания
      if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && ctx.chat) {
        const messageId = 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
        if (messageId) {
          this.removeMessageFromTracking(ctx.chat.id, messageId);
        }
      }
      await GetTtnButton.handle(ctx, this.requestPhone.bind(this));
    });

    this.bot.action('get_receipt', async (ctx) => {
      // Удаляем сообщение с inline кнопками из отслеживания
      if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && ctx.chat) {
        const messageId = 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
        if (messageId) {
          this.removeMessageFromTracking(ctx.chat.id, messageId);
        }
      }
      await GetReceiptButton.handle(ctx, this.requestPhone.bind(this));
    });

    // Обработчик получения контакта (телефона)
    this.bot.on('contact', async (ctx) => {
      await this.handleContact(ctx);
    });

    // Обработчики кнопок меню
    this.bot.hears(/^(📦 ТТН|ТТН)$/, async (ctx) => {
      await TtnMenuButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });

    this.bot.hears(/^(🧾 Чек|Чек)$/, async (ctx) => {
      await ReceiptMenuButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });

    this.bot.hears(/^(🎁 Бонусы|Бонусы)$/, async (ctx) => {
      await BonusesButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });

    this.bot.hears(/^(🎯 Акции|Акции)$/, async (ctx) => {
      await PromotionsButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });

    this.bot.hears(/^(📷 Инстаграмм|Инстаграмм)$/, async (ctx) => {
      await InstagramButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });

    this.bot.hears(/^(💬 Связаться с Менеджером|Связаться с Менеджером)$/, async (ctx) => {
      await ManagerButton.handle(ctx, this.sendMessageWithCleanup.bind(this), this.removeMessageFromTracking.bind(this));
    });
  }

  private async loadChatHistory(ctx: Context) {
    if (!ctx.chat) return;
    
    const chatId = ctx.chat.id;
    this.logger.debug(`Loading chat history for chat ${chatId}`);
    
    try {
      // В Telegram Bot API нет прямого метода для получения истории сообщений в личном чате
      // Но мы можем попытаться очистить старые сообщения, используя известные нам ID
      // Или просто инициализировать отслеживание для этого чата
      
      if (!this.chatMessages.has(chatId)) {
        this.chatMessages.set(chatId, []);
      }
      
      // Попытка найти и удалить старые сообщения бота
      // Это работает только если мы знаем их ID
      // В реальности, бот может видеть только сообщения, которые он отправил или получил
      
      // Очищаем все сообщения, которые превышают лимит
      await this.cleanupAllOldMessages(ctx, chatId);
      
    } catch (error: any) {
      this.logger.warn(`Failed to load chat history for chat ${chatId}:`, error?.message);
    }
  }

  private async cleanupAllOldMessages(ctx: Context, chatId: number) {
    const messages = this.chatMessages.get(chatId);
    if (!messages) return;
    
    // Если сообщений больше MAX_MESSAGES, удаляем все старые
    if (messages.length > this.MAX_MESSAGES) {
      const messagesToDelete = messages.length - this.MAX_MESSAGES;
      this.logger.debug(`Cleaning up ${messagesToDelete} old messages from chat history in chat ${chatId}`);
      
      // Удаляем самые старые сообщения
      const messagesToRemove: number[] = [];
      
      for (let i = 0; i < messagesToDelete; i++) {
        const messageId = messages[i];
        if (messageId) {
          try {
            await ctx.telegram.deleteMessage(chatId, messageId);
            messagesToRemove.push(messageId);
            this.logger.debug(`Deleted old message ${messageId} from chat ${chatId}`);
            
            // Небольшая задержка между удалениями
            if (i < messagesToDelete - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error: any) {
            const errorMessage = error?.message || '';
            if (errorMessage.includes('message to delete not found') || 
                errorMessage.includes('Bad Request: message can\'t be deleted') ||
                errorMessage.includes('message can\'t be deleted for everyone')) {
              // Сообщение уже удалено или не может быть удалено - удаляем из отслеживания
              messagesToRemove.push(messageId);
            }
          }
        }
      }
      
      // Удаляем успешно удаленные сообщения из массива
      messagesToRemove.forEach(msgId => {
        const index = messages.indexOf(msgId);
        if (index > -1) {
          messages.splice(index, 1);
        }
      });
    }
  }

  private removeMessageFromTracking(chatId: number, messageId: number) {
    const messages = this.chatMessages.get(chatId);
    if (messages) {
      const index = messages.indexOf(messageId);
      if (index > -1) {
        messages.splice(index, 1);
      }
    }
  }

  private async trackMessage(ctx: Context) {
    if (!ctx.chat || !ctx.message || !('message_id' in ctx.message)) return;
    
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    
    if (!this.chatMessages.has(chatId)) {
      this.chatMessages.set(chatId, []);
    }
    
    const messages = this.chatMessages.get(chatId)!;
    
    // Проверяем, не отслеживаем ли мы уже это сообщение
    if (!messages.includes(messageId)) {
      messages.push(messageId);
      this.logger.debug(`Tracking message ${messageId} in chat ${chatId}. Total messages: ${messages.length}`);
    }
    
    // Поддерживаем максимум MAX_MESSAGES сообщений - очищаем всю историю
    await this.cleanupOldMessages(ctx, chatId);
  }

  private async cleanupOldMessages(ctx: Context | any, chatId: number) {
    const messages = this.chatMessages.get(chatId);
    if (!messages || messages.length <= this.MAX_MESSAGES) {
      return;
    }
    
    // Если сообщений больше MAX_MESSAGES, удаляем самые старые
    const messagesToDelete = messages.length - this.MAX_MESSAGES;
    this.logger.debug(`Cleaning up ${messagesToDelete} old messages from chat ${chatId}. Total: ${messages.length}, Max: ${this.MAX_MESSAGES}`);
    
    const messagesToRemove: number[] = [];
    const telegram = ctx.telegram || this.bot?.telegram;
    
    if (!telegram) {
      this.logger.warn(`Cannot cleanup chat ${chatId}: telegram instance not available`);
      return;
    }
    
    for (let i = 0; i < messagesToDelete; i++) {
      const oldestMessageId = messages[i];
      if (oldestMessageId) {
        try {
          await telegram.deleteMessage(chatId, oldestMessageId);
          messagesToRemove.push(oldestMessageId);
          this.logger.debug(`Deleted old message ${oldestMessageId} from chat ${chatId}`);
          
          // Небольшая задержка между удалениями, чтобы не превысить rate limits
          if (i < messagesToDelete - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error: any) {
          // Если сообщение уже удалено или недоступно, все равно удаляем из отслеживания
          const errorMessage = error?.message || '';
          if (errorMessage.includes('message to delete not found') || 
              errorMessage.includes('Bad Request: message can\'t be deleted') ||
              errorMessage.includes('message can\'t be deleted for everyone')) {
            // Сообщение уже удалено или не может быть удалено - удаляем из отслеживания
            messagesToRemove.push(oldestMessageId);
          } else {
            this.logger.warn(`Failed to delete message ${oldestMessageId} from chat ${chatId}:`, errorMessage);
          }
        }
      }
    }
    
    // Удаляем успешно удаленные сообщения из массива
    messagesToRemove.forEach(msgId => {
      const index = messages.indexOf(msgId);
      if (index > -1) {
        messages.splice(index, 1);
      }
    });
    
    this.logger.debug(`After cleanup: ${messages.length} messages in chat ${chatId}`);
  }

  private async sendMessageWithCleanup(ctx: Context, message: string, keyboard?: any) {
    if (!ctx.chat) return;
    
    const sentMessage = keyboard 
      ? await ctx.reply(message, keyboard)
      : await ctx.reply(message);
    
    if (sentMessage) {
      const chatId = ctx.chat.id;
      
      if (!this.chatMessages.has(chatId)) {
        this.chatMessages.set(chatId, []);
      }
      
      const messages = this.chatMessages.get(chatId)!;
      messages.push(sentMessage.message_id);
      
      this.logger.debug(`Bot sent message ${sentMessage.message_id} in chat ${chatId}. Total messages: ${messages.length}`);
      
      // Поддерживаем максимум MAX_MESSAGES сообщений
      // Вызываем очистку сразу после добавления нового сообщения
      await this.cleanupOldMessages(ctx, chatId);
    }
    
    return sentMessage;
  }

  private async requestPhone(ctx: Context, action: 'ttn' | 'receipt') {
    const message = action === 'ttn' 
      ? '📦 Для получения ТТН необходимо поделиться номером телефона\n\n🔐 Ваши данные защищены и используются только для поиска ваших заказов'
      : '🧾 Для получения чека необходимо поделиться номером телефона\n\n🔐 Ваши данные защищены и используются только для поиска ваших заказов';

    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Поделиться номером телефона')]
    ]).resize();

    await this.sendMessageWithCleanup(ctx, message, keyboard);
  }

  private async handleContact(ctx: Context) {
    if (!ctx.from || !ctx.message || !('contact' in ctx.message)) {
      return;
    }

    const contact = ctx.message.contact;
    const telegramId = ctx.from.id.toString();

    // Обновляем все доступные данные пользователя
    const userData: any = {
      telegramId,
      phone: contact.phone_number,
    };

    // Добавляем данные из ctx.from, если они доступны
    if (ctx.from.username) {
      userData.username = ctx.from.username;
    }
    if (ctx.from.first_name) {
      userData.firstName = ctx.from.first_name;
    }
    if (ctx.from.last_name) {
      userData.lastName = ctx.from.last_name;
    }

    // Если контакт принадлежит самому пользователю, можем получить дополнительные данные
    if (contact.user_id === ctx.from.id) {
      // Контакт принадлежит пользователю, данные уже есть в ctx.from
    }

    await this.usersService.createOrUpdate(userData);

    // Отслеживаем сообщение с контактом
    await this.trackMessage(ctx);

    // Показываем главное меню
    await this.showMainMenu(ctx);
  }

  private async showMainMenu(ctx: Context) {
    const keyboard = Markup.keyboard([
      ['📦 ТТН', '🧾 Чек'],
      ['🎁 Бонусы', '🎯 Акции'],
      ['📷 Инстаграмм', '💬 Связаться с Менеджером']
    ]).resize();

    await this.sendMessageWithCleanup(ctx, '👋 Выберите действие:', keyboard);
  }

  private async handleStart(ctx: Context) {
    if (!ctx.from) return;

    const user = await this.usersService.createOrUpdate({
      telegramId: ctx.from.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    const isAdmin = user.role === UserRole.ADMIN;
    
    const message = `👋 Добро пожаловать, ${user.firstName || 'Пользователь'}! 🎉

${isAdmin ? '👑 Ваша роль: Администратор' : '👤 Ваша роль: Пользователь'}

Выберите действие:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📦 Получить ТТН', 'get_ttn')],
      [Markup.button.callback('🧾 Получить чек', 'get_receipt')],
    ]);

    await this.sendMessageWithCleanup(ctx, message, keyboard);
  }

  /**
   * Отправляет сообщение пользователю по его telegramId
   * @param telegramId - Telegram ID пользователя
   * @param message - Текст сообщения
   * @returns true если сообщение отправлено успешно, false в противном случае
   */
  async sendMessageToUser(telegramId: string, message: string): Promise<boolean> {
    if (!this.bot || !this.isBotRunning) {
      this.logger.warn('Bot is not running, cannot send message');
      return false;
    }

    try {
      const chatId = parseInt(telegramId, 10);
      if (isNaN(chatId)) {
        this.logger.error(`Invalid telegramId: ${telegramId}`);
        return false;
      }

      await this.bot.telegram.sendMessage(chatId, message);
      this.logger.log(`Message sent to user ${telegramId}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || '';
      // Игнорируем ошибки, если пользователь заблокировал бота или чат не найден
      if (errorMessage.includes('chat not found') || 
          errorMessage.includes('bot was blocked') ||
          errorMessage.includes('user is deactivated')) {
        this.logger.warn(`Cannot send message to user ${telegramId}: ${errorMessage}`);
      } else {
        this.logger.error(`Failed to send message to user ${telegramId}:`, errorMessage);
      }
      return false;
    }
  }

  /**
   * Отправляет сообщение нескольким пользователям
   * @param telegramIds - Массив Telegram ID пользователей
   * @param message - Текст сообщения
   * @returns Объект с результатами отправки
   */
  async sendMessageToUsers(telegramIds: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const telegramId of telegramIds) {
      const result = await this.sendMessageToUser(telegramId, message);
      if (result) {
        success++;
      } else {
        failed++;
      }
      // Небольшая задержка между отправками, чтобы не превысить rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return { success, failed };
  }
}
