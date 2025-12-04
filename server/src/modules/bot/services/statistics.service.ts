import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../users/user.entity';
import { Visit } from '../../../entities/visit.entity';

export interface StatisticsData {
  visitsToday: number;
  totalUsers: number;
  totalVipUsers: number;
  newUsers: number;
  newVipUsers: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Visit)
    private visitsRepository: Repository<Visit>,
  ) {}

  /**
   * Получить все статистические данные
   */
  async getStatistics(): Promise<StatisticsData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      visitsToday,
      totalUsers,
      totalVipUsers,
      newUsers,
      newVipUsers,
    ] = await Promise.all([
      this.getVisitsToday(today),
      this.getTotalUsers(),
      this.getTotalVipUsers(),
      this.getNewUsers(today),
      this.getNewVipUsers(today),
    ]);

    return {
      visitsToday,
      totalUsers,
      totalVipUsers,
      newVipUsers,
      newUsers,
    };
  }

  /**
   * Количество посещений за сегодня
   */
  async getVisitsToday(startOfDay: Date): Promise<number> {
    const count = await this.visitsRepository.count({
      where: {
        visitedAt: MoreThanOrEqual(startOfDay),
      },
    });
    return count;
  }

  /**
   * Общее количество пользователей
   */
  async getTotalUsers(): Promise<number> {
    return this.usersRepository.count();
  }

  /**
   * Общее количество VIP пользователей
   */
  async getTotalVipUsers(): Promise<number> {
    return this.usersRepository.count({
      where: { isVip: true },
    });
  }

  /**
   * Количество новых пользователей (за сегодня)
   */
  async getNewUsers(startOfDay: Date): Promise<number> {
    return this.usersRepository.count({
      where: {
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });
  }

  /**
   * Количество новых VIP пользователей (за сегодня)
   */
  async getNewVipUsers(startOfDay: Date): Promise<number> {
    return this.usersRepository.count({
      where: {
        isVip: true,
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });
  }

  /**
   * Зарегистрировать посещение пользователя
   */
  async trackVisit(userId: string): Promise<void> {
    const visit = this.visitsRepository.create({
      userId,
      visitedAt: new Date(),
    });
    await this.visitsRepository.save(visit);
  }

  /**
   * Запросить данные у 1С (заглушка для будущей реализации)
   */
  async requestDataFrom1C(): Promise<any> {
    // TODO: Реализовать интеграцию с 1С
    return {
      message: 'Запрос к 1С выполнен успешно',
      data: null,
    };
  }
}

