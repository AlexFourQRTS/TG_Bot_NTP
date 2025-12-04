import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/user.entity';
import { StatisticsService } from '../services/statistics.service';
import { MessageTrackingService } from '../services/message-tracking.service';
import { BotHandlers } from './bot-handlers';
import { GetTtnButton } from '../Button/get_ttn/get-ttn.button';
import { GetReceiptButton } from '../Button/get_receipt/get-receipt.button';
import { TtnMenuButton } from '../Button/ttn_menu/ttn-menu.button';
import { ReceiptMenuButton } from '../Button/receipt_menu/receipt-menu.button';
import { BonusesButton } from '../Button/bonuses/bonuses.button';
import { PromotionsButton } from '../Button/promotions/promotions.button';
import { InstagramButton } from '../Button/instagram/instagram.button';
import { ManagerButton } from '../Button/manager/manager.button';
import { AdminMenuButton } from '../Button/admin/admin-menu.button';
import { BroadcastButton } from '../Button/admin/broadcast.button';
import { BroadcastVipButton } from '../Button/admin/broadcast-vip.button';
import { StatisticsButton } from '../Button/admin/statistics.button';
import { Request1CButton } from '../Button/admin/request-1c.button';
import { SettingsMenuButton } from '../Button/settings/settings-menu.button';
import { KeyboardType } from '../../users/user.entity';

@Injectable()
export class BotInitializer {
  private readonly logger = new Logger(BotInitializer.name);
  private adminBroadcastState: Map<number, 'all' | 'vip' | null> = new Map();
  private chatHistoryLoaded: Map<number, boolean> = new Map();
  private pendingAction: Map<number, 'ttn' | 'receipt' | null> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly statisticsService: StatisticsService,
    private readonly messageTracking: MessageTrackingService,
    private readonly handlers: BotHandlers,
  ) {}

  initialize(bot: Telegraf): void {
    bot.use(async (ctx, next) => {
      if (ctx.chat && !this.chatHistoryLoaded.get(ctx.chat.id)) {
        await this.loadChatHistory(ctx);
        this.chatHistoryLoaded.set(ctx.chat.id, true);
      }
      
      if (ctx.from) {
        const user = await this.usersService.findOne(ctx.from.id.toString());
        if (user && user.id) {
          await this.statisticsService.trackVisit(user.id).catch(() => {});
        }
      }
      
      if (ctx.message && 'message_id' in ctx.message) {
        await this.messageTracking.trackMessage(ctx, bot.telegram);
      }
      return next();
    });

    bot.start(async (ctx) => {
      await this.handlers.handleStart(ctx);
    });

    bot.action('get_ttn', async (ctx) => {
      const telegramId = ctx.from?.id?.toString();
      this.logger.log(`[get_ttn] ===== BUTTON CLICKED ===== User: ${telegramId}, Username: ${ctx.from?.username || 'N/A'}`);
      this.removeMessageFromTracking(ctx);
      if (ctx.from) {
        this.pendingAction.set(ctx.from.id, 'ttn');
        this.logger.log(`[get_ttn] Pending action set to 'ttn' for user: ${telegramId}`);
      } else {
        this.logger.warn(`[get_ttn] WARNING: ctx.from is null or undefined!`);
      }
      this.logger.log(`[get_ttn] Calling GetTtnButton.handle...`);
      await GetTtnButton.handle(ctx, this.handlers.requestPhone.bind(this.handlers));
      this.logger.log(`[get_ttn] GetTtnButton.handle completed`);
    });

    bot.action('get_receipt', async (ctx) => {
      const telegramId = ctx.from?.id?.toString();
      this.logger.log(`[get_receipt] ===== BUTTON CLICKED ===== User: ${telegramId}, Username: ${ctx.from?.username || 'N/A'}`);
      this.removeMessageFromTracking(ctx);
      if (ctx.from) {
        this.pendingAction.set(ctx.from.id, 'receipt');
        this.logger.log(`[get_receipt] Pending action set to 'receipt' for user: ${telegramId}`);
      } else {
        this.logger.warn(`[get_receipt] WARNING: ctx.from is null or undefined!`);
      }
      this.logger.log(`[get_receipt] Calling GetReceiptButton.handle...`);
      await GetReceiptButton.handle(ctx, this.handlers.requestPhone.bind(this.handlers));
      this.logger.log(`[get_receipt] GetReceiptButton.handle completed`);
    });

    bot.on('contact', async (ctx) => {
      if (!ctx.from) return;
      
      const action = this.pendingAction.get(ctx.from.id);
      await this.handlers.handleContact(ctx, action);
      
      if (action) {
        this.pendingAction.delete(ctx.from.id);
      }
    });

    bot.action('menu_ttn', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await TtnMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_receipt', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await ReceiptMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_bonuses', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await BonusesButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_promotions', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await PromotionsButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_instagram', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await InstagramButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_manager', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await ManagerButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('menu_start', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await this.handlers.handleStart(ctx);
    });

    bot.action('menu_settings', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      if (!ctx.from) return;
      const user = await this.usersService.findOne(ctx.from.id.toString());
      const keyboardType = user?.keyboardType || KeyboardType.REPLY;
      await SettingsMenuButton.handle(
        ctx,
        this.sendMessage.bind(this),
        this.removeMessageFromTracking.bind(this),
        keyboardType
      );
    });

    bot.action('settings_keyboard_reply', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await this.handlers.updateKeyboardType(ctx, KeyboardType.REPLY);
    });

    bot.action('settings_keyboard_inline', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await this.handlers.updateKeyboardType(ctx, KeyboardType.INLINE);
    });

    bot.action('menu_back', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await this.handlers.showMainMenu(ctx);
    });

    bot.action('admin_menu', async (ctx) => {
      this.removeMessageFromTracking(ctx);
      await AdminMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
    });

    bot.action('admin_broadcast', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.usersService.findOne(ctx.from.id.toString());
      if (user && user.role === UserRole.ADMIN) {
        this.adminBroadcastState.set(ctx.from.id, 'all');
        await BroadcastButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
      }
    });

    bot.action('admin_broadcast_vip', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.usersService.findOne(ctx.from.id.toString());
      if (user && user.role === UserRole.ADMIN) {
        this.adminBroadcastState.set(ctx.from.id, 'vip');
        await BroadcastVipButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
      }
    });

    bot.action('admin_statistics', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.usersService.findOne(ctx.from.id.toString());
      if (user && user.role === UserRole.ADMIN) {
        await StatisticsButton.handle(ctx, this.statisticsService, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
      }
    });

    bot.action('admin_1c_request', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.usersService.findOne(ctx.from.id.toString());
      if (user && user.role === UserRole.ADMIN) {
        await Request1CButton.handle(ctx, this.statisticsService, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
      }
    });

    bot.on('text', async (ctx) => {
      if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
      
      const broadcastType = this.adminBroadcastState.get(ctx.from.id);
      if (broadcastType) {
        const user = await this.usersService.findOne(ctx.from.id.toString());
        if (user && user.role === UserRole.ADMIN) {
          await this.handlers.handleAdminBroadcast(ctx, bot, broadcastType, ctx.message.text);
          this.adminBroadcastState.delete(ctx.from.id);
          return;
        }
      }

      // Обработка обычной клавиатуры для пользователей с REPLY типом
      const user = await this.usersService.findOne(ctx.from.id.toString());
      const keyboardType = user?.keyboardType || KeyboardType.REPLY;
      
      if (keyboardType === KeyboardType.REPLY) {
        const text = ctx.message.text;
        
        // Обработка кнопок из начального меню (для получения номера телефона)
        if (text === '📦 Получить ТТН' || text === 'Получить ТТН') {
          const telegramId = ctx.from.id.toString();
          this.logger.log(`[text] ===== BUTTON "Получить ТТН" CLICKED ===== User: ${telegramId}`);
          if (ctx.from) {
            this.pendingAction.set(ctx.from.id, 'ttn');
            this.logger.log(`[text] Pending action set to 'ttn' for user: ${telegramId}`);
          }
          await this.handlers.requestPhone(ctx, 'ttn');
          return;
        } else if (text === '🧾 Получить чек' || text === 'Получить чек') {
          const telegramId = ctx.from.id.toString();
          this.logger.log(`[text] ===== BUTTON "Получить чек" CLICKED ===== User: ${telegramId}`);
          if (ctx.from) {
            this.pendingAction.set(ctx.from.id, 'receipt');
            this.logger.log(`[text] Pending action set to 'receipt' for user: ${telegramId}`);
          }
          await this.handlers.requestPhone(ctx, 'receipt');
          return;
        }
        
        // Обработка кнопок из главного меню
        if (text === '📦 ТТН' || text === 'ТТН') {
          await TtnMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '🧾 Чек' || text === 'Чек') {
          await ReceiptMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '🎁 Бонусы' || text === 'Бонусы') {
          await BonusesButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '🎯 Акции' || text === 'Акции') {
          await PromotionsButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '📷 Инстаграмм' || text === 'Инстаграмм') {
          await InstagramButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '💬 Связаться с Менеджером' || text === 'Связаться с Менеджером') {
          await ManagerButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
        } else if (text === '👑 Админка' || text === 'Админка') {
          if (user && user.role === UserRole.ADMIN) {
            await AdminMenuButton.handle(ctx, this.sendMessage.bind(this), this.removeMessageFromTracking.bind(this));
          } else {
            await this.sendMessage(ctx, '❌ У вас нет прав доступа к админ-панели');
          }
        } else if (text === '🚀 Старт' || text === 'Старт') {
          await this.handlers.handleStart(ctx);
        } else if (text === '⚙️ Настройки' || text === 'Настройки') {
          const currentKeyboardType = user?.keyboardType || KeyboardType.REPLY;
          await SettingsMenuButton.handle(
            ctx,
            this.sendMessage.bind(this),
            this.removeMessageFromTracking.bind(this),
            currentKeyboardType
          );
        }
      }
    });
  }

  private removeMessageFromTracking(ctx: Context): void {
    if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && ctx.chat) {
      const messageId = 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
      if (messageId) {
        this.messageTracking.removeMessageFromTracking(ctx.chat.id, messageId);
      }
    }
  }

  private async sendMessage(ctx: Context, message: string, keyboard?: any): Promise<any> {
    return this.messageTracking.sendMessageWithCleanup(ctx, message, keyboard);
  }

  private async loadChatHistory(ctx: Context): Promise<void> {
    if (!ctx.chat) return;
    
    const chatId = ctx.chat.id;
    
    if (!this.messageTracking.hasChat(chatId)) {
      this.messageTracking.initializeChat(chatId);
    }
    
    // Автоматическая очистка отключена при загрузке истории
    // await this.messageTracking.cleanupAllOldMessages(ctx, chatId);
  }

  async cleanupAllChats(bot: Telegraf): Promise<void> {
    // Периодическая очистка всех чатов выполняется через MessageTrackingService
    // Этот метод оставлен для совместимости с BotConnectionService
  }
}

