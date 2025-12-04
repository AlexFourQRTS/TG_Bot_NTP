import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegram } from 'telegraf';

@Injectable()
export class MessageTrackingService {
  private readonly logger = new Logger(MessageTrackingService.name);
  private chatMessages: Map<number, number[]> = new Map();
  private readonly MAX_MESSAGES = 100;

  async trackMessage(ctx: Context, telegram: Telegram): Promise<void> {
    if (!ctx.chat || !ctx.message || !('message_id' in ctx.message)) return;
    
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    
    if (!this.chatMessages.has(chatId)) {
      this.chatMessages.set(chatId, []);
    }
    
    const messages = this.chatMessages.get(chatId)!;
    
    if (!messages.includes(messageId)) {
      messages.push(messageId);
      this.logger.debug(`Tracking message ${messageId} in chat ${chatId}. Total: ${messages.length}`);
    }
    
    // Автоматическая очистка отключена - удаляем только при превышении 100 сообщений
    if (messages.length > this.MAX_MESSAGES) {
      await this.cleanupOldMessages({ telegram } as Context, chatId);
    }
  }

  async sendMessageWithCleanup(
    ctx: Context,
    message: string,
    keyboard?: any
  ): Promise<any> {
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
      
      this.logger.debug(`Bot sent message ${sentMessage.message_id} in chat ${chatId}. Total: ${messages.length}`);
      
      // Автоматическая очистка отключена - удаляем только при превышении 100 сообщений
      if (messages.length > this.MAX_MESSAGES) {
        await this.cleanupOldMessages(ctx, chatId);
      }
    }
    
    return sentMessage;
  }

  removeMessageFromTracking(chatId: number, messageId: number): void {
    const messages = this.chatMessages.get(chatId);
    if (messages) {
      const index = messages.indexOf(messageId);
      if (index > -1) {
        messages.splice(index, 1);
      }
    }
  }

  private async cleanupOldMessages(ctx: Context | any, chatId: number): Promise<void> {
    const messages = this.chatMessages.get(chatId);
    if (!messages || messages.length <= this.MAX_MESSAGES) {
      return;
    }
    
    const messagesToDelete = messages.length - this.MAX_MESSAGES;
    this.logger.debug(`Cleaning up ${messagesToDelete} old messages from chat ${chatId}. Total: ${messages.length}`);
    
    const messagesToRemove: number[] = [];
    const telegram = ctx.telegram;
    
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
          
          if (i < messagesToDelete - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error: any) {
          const errorMessage = error?.message || '';
          if (errorMessage.includes('message to delete not found') || 
              errorMessage.includes('Bad Request: message can\'t be deleted') ||
              errorMessage.includes('message can\'t be deleted for everyone')) {
            messagesToRemove.push(oldestMessageId);
          } else {
            this.logger.warn(`Failed to delete message ${oldestMessageId} from chat ${chatId}:`, errorMessage);
          }
        }
      }
    }
    
    messagesToRemove.forEach(msgId => {
      const index = messages.indexOf(msgId);
      if (index > -1) {
        messages.splice(index, 1);
      }
    });
    
    this.logger.debug(`After cleanup: ${messages.length} messages in chat ${chatId}`);
  }

  async cleanupAllOldMessages(ctx: Context, chatId: number): Promise<void> {
    const messages = this.chatMessages.get(chatId);
    if (!messages) return;
    
    if (messages.length > this.MAX_MESSAGES) {
      const messagesToDelete = messages.length - this.MAX_MESSAGES;
      this.logger.debug(`Cleaning up ${messagesToDelete} old messages from chat history in chat ${chatId}`);
      
      const messagesToRemove: number[] = [];
      
      for (let i = 0; i < messagesToDelete; i++) {
        const messageId = messages[i];
        if (messageId) {
          try {
            await ctx.telegram.deleteMessage(chatId, messageId);
            messagesToRemove.push(messageId);
            this.logger.debug(`Deleted old message ${messageId} from chat ${chatId}`);
            
            if (i < messagesToDelete - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error: any) {
            const errorMessage = error?.message || '';
            if (errorMessage.includes('message to delete not found') || 
                errorMessage.includes('Bad Request: message can\'t be deleted') ||
                errorMessage.includes('message can\'t be deleted for everyone')) {
              messagesToRemove.push(messageId);
            }
          }
        }
      }
      
      messagesToRemove.forEach(msgId => {
        const index = messages.indexOf(msgId);
        if (index > -1) {
          messages.splice(index, 1);
        }
      });
    }
  }

  hasChat(chatId: number): boolean {
    return this.chatMessages.has(chatId);
  }

  initializeChat(chatId: number): void {
    if (!this.chatMessages.has(chatId)) {
      this.chatMessages.set(chatId, []);
    }
  }
}

