import { KeyboardButton } from './keyboard-button.entity';
import { InlineButton } from './inline-button.entity';
import { Markup } from 'telegraf';

/**
 * Класс для представления сообщения в Telegram боте
 * Инкапсулирует текст сообщения и опциональную клавиатуру
 */
export class Message {
  private text: string;
  private keyboardButtons: KeyboardButton[][] = [];
  private inlineButtons: InlineButton[][] = [];

  constructor(text: string) {
    this.text = text;
  }

  /**
   * Получить текст сообщения
   */
  getText(): string {
    return this.text;
  }

  /**
   * Установить текст сообщения
   */
  setText(text: string): this {
    this.text = text;
    return this;
  }

  /**
   * Добавить кнопки клавиатуры (обычные кнопки)
   * @param buttons - массив кнопок для одной строки
   */
  addKeyboardRow(buttons: KeyboardButton[]): this {
    this.keyboardButtons.push(buttons);
    return this;
  }

  /**
   * Установить все кнопки клавиатуры
   * @param buttons - двумерный массив кнопок (каждая строка - это ряд кнопок)
   */
  setKeyboardButtons(buttons: KeyboardButton[][]): this {
    this.keyboardButtons = buttons;
    return this;
  }

  /**
   * Получить кнопки клавиатуры
   */
  getKeyboardButtons(): KeyboardButton[][] {
    return this.keyboardButtons;
  }

  /**
   * Добавить инлайн кнопки (одну строку)
   * @param buttons - массив инлайн кнопок для одной строки
   */
  addInlineRow(buttons: InlineButton[]): this {
    this.inlineButtons.push(buttons);
    return this;
  }

  /**
   * Установить все инлайн кнопки
   * @param buttons - двумерный массив инлайн кнопок
   */
  setInlineButtons(buttons: InlineButton[][]): this {
    this.inlineButtons = buttons;
    return this;
  }

  /**
   * Получить инлайн кнопки
   */
  getInlineButtons(): InlineButton[][] {
    return this.inlineButtons;
  }

  /**
   * Проверить, есть ли кнопки клавиатуры
   */
  hasKeyboardButtons(): boolean {
    return this.keyboardButtons.length > 0;
  }

  /**
   * Проверить, есть ли инлайн кнопки
   */
  hasInlineButtons(): boolean {
    return this.inlineButtons.length > 0;
  }

  /**
   * Конвертировать в формат Telegraf Markup для отправки
   * Возвращает объект клавиатуры, готовый для использования в ctx.reply()
   */
  toTelegrafKeyboard(): any {
    if (this.hasKeyboardButtons()) {
      const keyboardRows = this.keyboardButtons.map(row => 
        row.map(button => button.toTelegrafFormat())
      );
      return Markup.keyboard(keyboardRows).resize();
    }

    if (this.hasInlineButtons()) {
      const inlineRows = this.inlineButtons.map(row =>
        row.map(button => button.toTelegrafFormat())
      );
      return Markup.inlineKeyboard(inlineRows);
    }

    return undefined;
  }

  /**
   * Создать новый экземпляр сообщения
   */
  static create(text: string): Message {
    return new Message(text);
  }
}

