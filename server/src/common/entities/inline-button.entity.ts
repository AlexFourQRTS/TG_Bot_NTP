import { Markup } from 'telegraf';

/**
 * Типы инлайн кнопок
 */
export enum InlineButtonType {
  CALLBACK = 'callback',
  URL = 'url',
  WEB_APP = 'web_app',
  LOGIN_URL = 'login_url',
  SWITCH_INLINE_QUERY = 'switch_inline_query',
  SWITCH_INLINE_QUERY_CURRENT_CHAT = 'switch_inline_query_current_chat',
  CALLBACK_GAME = 'callback_game',
  PAY = 'pay',
}

/**
 * Класс для представления инлайн кнопки (кнопка под сообщением)
 */
export class InlineButton {
  private text: string;
  private type: InlineButtonType;
  private callbackData?: string;
  private url?: string;
  private webAppUrl?: string;
  private loginUrl?: any;
  private switchInlineQuery?: string;
  private switchInlineQueryCurrentChat?: string;

  constructor(text: string) {
    this.text = text;
    this.type = InlineButtonType.CALLBACK;
  }

  /**
   * Получить текст кнопки
   */
  getText(): string {
    return this.text;
  }

  /**
   * Установить текст кнопки
   */
  setText(text: string): this {
    this.text = text;
    return this;
  }

  /**
   * Сделать кнопку callback (обработчик события)
   * @param callbackData - данные, которые будут переданы в обработчик
   */
  asCallback(callbackData: string): this {
    this.type = InlineButtonType.CALLBACK;
    this.callbackData = callbackData;
    return this;
  }

  /**
   * Сделать кнопку URL (открывает ссылку)
   * @param url - URL для открытия
   */
  asUrl(url: string): this {
    this.type = InlineButtonType.URL;
    this.url = url;
    return this;
  }

  /**
   * Сделать кнопку Web App (открывает веб-приложение)
   * @param webAppUrl - URL веб-приложения
   */
  asWebApp(webAppUrl: string): this {
    this.type = InlineButtonType.WEB_APP;
    this.webAppUrl = webAppUrl;
    return this;
  }

  /**
   * Сделать кнопку Login URL (авторизация через Telegram)
   * @param loginUrl - объект с настройками авторизации
   */
  asLoginUrl(loginUrl: any): this {
    this.type = InlineButtonType.LOGIN_URL;
    this.loginUrl = loginUrl;
    return this;
  }

  /**
   * Сделать кнопку переключения в inline режим
   * @param query - запрос для inline режима
   */
  asSwitchInlineQuery(query: string): this {
    this.type = InlineButtonType.SWITCH_INLINE_QUERY;
    this.switchInlineQuery = query;
    return this;
  }

  /**
   * Сделать кнопку переключения в inline режим в текущем чате
   * @param query - запрос для inline режима
   */
  asSwitchInlineQueryCurrentChat(query: string): this {
    this.type = InlineButtonType.SWITCH_INLINE_QUERY_CURRENT_CHAT;
    this.switchInlineQueryCurrentChat = query;
    return this;
  }

  /**
   * Получить тип кнопки
   */
  getType(): InlineButtonType {
    return this.type;
  }

  /**
   * Получить callback данные
   */
  getCallbackData(): string | undefined {
    return this.callbackData;
  }

  /**
   * Получить URL
   */
  getUrl(): string | undefined {
    return this.url;
  }

  /**
   * Конвертировать в формат Telegraf для использования в Markup.inlineKeyboard()
   */
  toTelegrafFormat(): any {
    switch (this.type) {
      case InlineButtonType.CALLBACK:
        if (!this.callbackData) {
          throw new Error('Callback data is required for callback button');
        }
        return Markup.button.callback(this.text, this.callbackData);

      case InlineButtonType.URL:
        if (!this.url) {
          throw new Error('URL is required for URL button');
        }
        return Markup.button.url(this.text, this.url);

      case InlineButtonType.WEB_APP:
        if (!this.webAppUrl) {
          throw new Error('Web app URL is required for Web app button');
        }
        return Markup.button.webApp(this.text, this.webAppUrl);

      case InlineButtonType.LOGIN_URL:
        if (!this.loginUrl) {
          throw new Error('Login URL is required for Login URL button');
        }
        return Markup.button.login(this.text, this.loginUrl);

      case InlineButtonType.SWITCH_INLINE_QUERY:
        if (!this.switchInlineQuery) {
          throw new Error('Query is required for switch inline query button');
        }
        // Используем прямой формат Telegram API
        return {
          text: this.text,
          switch_inline_query: this.switchInlineQuery,
        };

      case InlineButtonType.SWITCH_INLINE_QUERY_CURRENT_CHAT:
        if (!this.switchInlineQueryCurrentChat) {
          throw new Error('Query is required for switch inline query current chat button');
        }
        // Используем прямой формат Telegram API
        return {
          text: this.text,
          switch_inline_query_current_chat: this.switchInlineQueryCurrentChat,
        };

      default:
        throw new Error(`Unsupported inline button type: ${this.type}`);
    }
  }

  /**
   * Создать callback кнопку
   */
  static createCallback(text: string, callbackData: string): InlineButton {
    return new InlineButton(text).asCallback(callbackData);
  }

  /**
   * Создать URL кнопку
   */
  static createUrl(text: string, url: string): InlineButton {
    return new InlineButton(text).asUrl(url);
  }

  /**
   * Создать Web App кнопку
   */
  static createWebApp(text: string, webAppUrl: string): InlineButton {
    return new InlineButton(text).asWebApp(webAppUrl);
  }

  /**
   * Создать простую инлайн кнопку
   */
  static create(text: string): InlineButton {
    return new InlineButton(text);
  }
}

