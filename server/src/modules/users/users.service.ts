import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(telegramId: number | string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { telegramId: telegramId.toString() } });
  }

  async createOrUpdate(userData: Partial<User> & { telegramId: number | string }): Promise<User> {
    const telegramIdString = userData.telegramId.toString();
    let user = await this.findOne(telegramIdString);

    if (!user) {
      user = this.usersRepository.create({
        ...userData,
        telegramId: telegramIdString
      });
    } else {
      this.usersRepository.merge(user, {
        ...userData,
        telegramId: telegramIdString
      });
    }

    return this.usersRepository.save(user);
  }

  async setRole(telegramId: number | string, role: UserRole): Promise<User> {
    const user = await this.findOne(telegramId.toString());
    if (user) {
      user.role = role;
      return this.usersRepository.save(user);
    }
    return null;
  }
}
