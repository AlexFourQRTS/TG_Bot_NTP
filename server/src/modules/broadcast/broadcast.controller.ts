import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { BroadcastService } from './broadcast.service';
import { BirthdayBroadcastService } from './birthday-broadcast.service';
import { AdminGuard } from '../users/guards/admin.guard';

export class BroadcastDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class BirthdayBroadcastDto {
  @IsOptional()
  @IsString()
  message?: string;
}

@Controller('broadcast')
@UseGuards(AdminGuard)
export class BroadcastController {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly birthdayBroadcastService: BirthdayBroadcastService,
  ) {}

  /**
   * Рассылка сообщения всем пользователям
   * POST /broadcast
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async broadcastToAll(@Body() dto: BroadcastDto) {
    const result = await this.broadcastService.broadcastToAll(dto.message);
    return {
      success: true,
      message: 'Broadcast completed',
      result,
    };
  }

  /**
   * Рассылка сообщения пользователям с определенной ролью
   * POST /broadcast/role
   */
  @Post('role')
  @HttpCode(HttpStatus.OK)
  async broadcastToRole(@Body() dto: BroadcastDto) {
    const result = await this.broadcastService.broadcastToRole(dto.message, dto.role);
    return {
      success: true,
      message: 'Broadcast to role completed',
      result,
    };
  }

  /**
   * Рассылка поздравлений с днем рождения
   * POST /broadcast/birthday
   */
  @Post('birthday')
  @HttpCode(HttpStatus.OK)
  async broadcastBirthday(@Body() dto: BirthdayBroadcastDto) {
    const result = await this.birthdayBroadcastService.sendBirthdayGreetings(dto.message);
    return {
      success: true,
      message: 'Birthday broadcast completed',
      result,
    };
  }
}

