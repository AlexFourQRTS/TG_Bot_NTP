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

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not set');
      return;
    }

    this.bot = new Telegraf(token);
    this.initializeBot();
    
    this.bot.launch().then(() => {
      this.logger.log('Bot started');
    }).catch((err) => {
      this.logger.error('Failed to start bot', err);
    });
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGINT');
    }
  }

  private initializeBot() {
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // Обработчики кнопок - запрашивают телефон
    this.bot.action('get_ttn', async (ctx) => {
      await GetTtnButton.handle(ctx, this.requestPhone.bind(this));
    });

    this.bot.action('get_receipt', async (ctx) => {
      await GetReceiptButton.handle(ctx, this.requestPhone.bind(this));
    });

    // Обработчик получения контакта (телефона)
    this.bot.on('contact', async (ctx) => {
      await this.handleContact(ctx);
    });

    // Обработчики кнопок меню
    this.bot.hears(/^(📦 ТТН|ТТН)$/, async (ctx) => {
      await TtnMenuButton.handle(ctx);
    });

    this.bot.hears(/^(🧾 Чек|Чек)$/, async (ctx) => {
      await ReceiptMenuButton.handle(ctx);
    });

    this.bot.hears(/^(🎁 Бонусы|Бонусы)$/, async (ctx) => {
      await BonusesButton.handle(ctx);
    });

    this.bot.hears(/^(🎯 Акции|Акции)$/, async (ctx) => {
      await PromotionsButton.handle(ctx);
    });

    this.bot.hears(/^(📷 Инстаграмм|Инстаграмм)$/, async (ctx) => {
      await InstagramButton.handle(ctx);
    });

    this.bot.hears(/^(💬 Связаться с Менеджером|Связаться с Менеджером)$/, async (ctx) => {
      await ManagerButton.handle(ctx);
    });
  }

  private async requestPhone(ctx: Context, action: 'ttn' | 'receipt') {
    const message = action === 'ttn' 
      ? 'Для получения ТТН необходимо поделиться номером телефона'
      : 'Для получения чека необходимо поделиться номером телефона';

    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Поделиться номером телефона')]
    ]).resize();

    await ctx.reply(message, keyboard);
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

    // Удаляем сообщение с запросом контакта
    await ctx.deleteMessage().catch(() => {});

    // Показываем главное меню
    await this.showMainMenu(ctx);
  }

  private async showMainMenu(ctx: Context) {
    const keyboard = Markup.keyboard([
      ['📦 ТТН', '🧾 Чек'],
      ['🎁 Бонусы', '🎯 Акции'],
      ['📷 Инстаграмм', '💬 Связаться с Менеджером']
    ]).resize();

    await ctx.reply('Выберите действие:', keyboard);
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
    
    const message = `Добро пожаловать, ${user.firstName || 'Пользователь'}!
Ваша роль: ${isAdmin ? 'Администратор' : 'Пользователь'}
Выберите действие:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📦 Получить ТТН', 'get_ttn')],
      [Markup.button.callback('🧾 Получить чек', 'get_receipt')],
    ]);

    await ctx.reply(message, keyboard);
  }
}
