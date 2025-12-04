import { Markup } from 'telegraf';

/**
 * Типы кнопок клавиатуры
 */
export enum KeyboardButtonType {
  TEXT = 'text',
  CONTACT_REQUEST = 'contact_request',
  LOCATION_REQUEST = 'location_request',
  POLL_REQUEST = 'poll_request',
}

/**
 * Класс для представления кнопки клавиатуры (обычной кнопки внизу экрана)
 */
export class KeyboardButton {
  private text: string;
  private type: KeyboardButtonType;
  private requestContact: boolean = false;
  private requestLocation: boolean = false;
  private requestPoll: boolean = false;

  constructor(text: string) {
    this.text = text;
    this.type = KeyboardButtonType.TEXT;
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
   * Сделать кнопку запроса контакта
   */
  asContactRequest(): this {
    this.requestContact = true;
    this.type = KeyboardButtonType.CONTACT_REQUEST;
    return this;
  }

  /**
   * Сделать кнопку запроса местоположения
   */
  asLocationRequest(): this {
    this.requestLocation = true;
    this.type = KeyboardButtonType.LOCATION_REQUEST;
    return this;
  }

  /**
   * Сделать кнопку запроса опроса
   */
  asPollRequest(): this {
    this.requestPoll = true;
    this.type = KeyboardButtonType.POLL_REQUEST;
    return this;
  }

  /**
   * Проверить, является ли кнопка запросом контакта
   */
  isContactRequest(): boolean {
    return this.requestContact;
  }

  /**
   * Проверить, является ли кнопка запросом местоположения
   */
  isLocationRequest(): boolean {
    return this.requestLocation;
  }

  /**
   * Проверить, является ли кнопка запросом опроса
   */
  isPollRequest(): boolean {
    return this.requestPoll;
  }

  /**
   * Получить тип кнопки
   */
  getType(): KeyboardButtonType {
    return this.type;
  }

  /**
   * Конвертировать в формат Telegraf для использования в Markup.keyboard()
   */
  toTelegrafFormat(): any {
    if (this.requestContact) {
      return Markup.button.contactRequest(this.text);
    }
    if (this.requestLocation) {
      return Markup.button.locationRequest(this.text);
    }
    if (this.requestPoll) {
      return Markup.button.pollRequest(this.text);
    }
    // Обычная текстовая кнопка
    return this.text;
  }

  /**
   * Создать простую текстовую кнопку
   */
  static create(text: string): KeyboardButton {
    return new KeyboardButton(text);
  }

  /**
   * Создать кнопку запроса контакта
   */
  static createContactRequest(text: string): KeyboardButton {
    return new KeyboardButton(text).asContactRequest();
  }

  /**
   * Создать кнопку запроса местоположения
   */
  static createLocationRequest(text: string): KeyboardButton {
    return new KeyboardButton(text).asLocationRequest();
  }

  /**
   * Создать кнопку запроса опроса
   */
  static createPollRequest(text: string): KeyboardButton {
    return new KeyboardButton(text).asPollRequest();
  }
}

