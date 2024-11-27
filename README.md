# Buity Salon Management System

Современная система управления салоном красоты с онлайн-записью и управлением специалистами.

## Основные функции

- 👤 Аутентификация пользователей (регистрация/вход)
- 📅 Онлайн запись на услуги
- 👩‍💼 Управление специалистами
- 💅 Каталог услуг
- 📊 История записей

## Технологии

- Backend: Node.js, Express.js
- Database: MySQL
- Frontend: HTML5, CSS3, JavaScript
- UI Framework: Bootstrap 5.3.2
- Дополнительные библиотеки:
  - JWT для аутентификации
  - bcryptjs для хеширования паролей
  - Flatpickr для выбора даты/времени

## Установка

1. Клонируйте репозиторий:
```bash
git clone [url-репозитория]
cd buity-saloon
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env и настройте переменные окружения:
```env
MYSQL_DATABASE=railway
MYSQLUSER=root
MYSQLPASSWORD=your_password
MYSQLHOST=localhost
MYSQLPORT=3306
JWT_SECRET=your_secret
```

4. Запустите приложение:
```bash
# Режим разработки
npm run dev

# Продакшн
npm start
```

## Структура проекта

```
buity-saloon/
├── public/              # Статические файлы
│   ├── index.html      # Главная страница
│   ├── styles.css      # Стили
│   └── app.js          # Клиентский JavaScript
├── server.js           # Основной файл сервера
├── package.json        # Зависимости и скрипты
└── .env               # Конфигурация окружения
```

## API Endpoints

### Аутентификация
- POST /api/register - Регистрация нового пользователя
- POST /api/login - Вход в систему
- GET /api/profile - Получение профиля пользователя

### Записи
- POST /api/appointments - Создание новой записи
- GET /api/appointments - Получение списка записей

### Специалисты
- GET /api/specialists - Список специалистов
- GET /api/specialists/:id/availability - Доступное время специалиста

### Услуги
- GET /api/services - Список услуг

## Безопасность

- JWT для аутентификации
- Хеширование паролей с bcrypt
- Валидация входных данных
- CORS защита
- Защита от SQL-инъекций

## Развертывание

Приложение готово к развертыванию на:
- Railway (база данных)
- Render (приложение)

## Разработка

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте изменения в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## Лицензия

Распространяется под лицензией ISC. Смотрите `LICENSE` для получения дополнительной информации.

## Контакты

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/buity-saloon](https://github.com/yourusername/buity-saloon)
