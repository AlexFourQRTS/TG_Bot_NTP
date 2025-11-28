# ExBotTl - Telegram Bot on NestJS

Telegram бот на NestJS с TypeORM.

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env`
2. Заполните необходимые переменные окружения

## Запуск

```bash
# Разработка
npm run start:dev

# Продакшн
npm run start:prod
```

## Структура проекта

- `src/` - исходный код
- `src/modules/` - модули приложения
- `src/entities/` - сущности TypeORM
- `src/common/` - общие утилиты
- `src/config/` - конфигурации

## Алиасы путей

- `@/*` - `src/*`
- `@common/*` - `src/common/*`
- `@config/*` - `src/config/*`
- `@modules/*` - `src/modules/*`
- `@entities/*` - `src/entities/*`

