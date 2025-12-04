import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UserRole } from '../user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Получаем telegramId из заголовка или query параметров
    // В реальном приложении лучше использовать JWT токен
    const telegramId = request.headers['x-telegram-id'] || request.query.telegramId;
    
    if (!telegramId) {
      throw new UnauthorizedException('Telegram ID is required');
    }

    const user = await this.usersService.findOne(telegramId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }

    return true;
  }
}

