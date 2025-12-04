import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Patch } from '@nestjs/common';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';
import { AdminGuard } from './guards/admin.guard';

export class SetRoleDto {
  @IsString()
  telegramId: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserDto {
  @IsString()
  telegramId: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Получить всех пользователей
   * GET /users
   */
  @Get()
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return {
      success: true,
      users,
    };
  }

  /**
   * Получить пользователя по telegramId
   * GET /users/:telegramId
   */
  @Get(':telegramId')
  async getUser(@Param('telegramId') telegramId: string) {
    const user = await this.usersService.findOne(telegramId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }
    return {
      success: true,
      user,
    };
  }

  /**
   * Установить роль пользователю
   * POST /users/set-role
   */
  @Post('set-role')
  @HttpCode(HttpStatus.OK)
  async setRole(@Body() dto: SetRoleDto) {
    const user = await this.usersService.setRole(dto.telegramId, dto.role);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }
    return {
      success: true,
      message: 'Role updated successfully',
      user,
    };
  }

  /**
   * Обновить данные пользователя (роль, день рождения)
   * PATCH /users/update
   */
  @Patch('update')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Body() dto: UpdateUserDto) {
    const updateData: any = {};
    
    if (dto.birthday) {
      updateData.birthday = new Date(dto.birthday);
    }
    
    if (dto.role) {
      updateData.role = dto.role;
    }

    const user = await this.usersService.createOrUpdate({
      telegramId: dto.telegramId,
      ...updateData,
    });

    return {
      success: true,
      message: 'User updated successfully',
      user,
    };
  }
}

