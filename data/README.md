# Gallery Data

Ця директорія містить метадані для галереї астрофотографій у форматі YAML.

## Структура

```
data/
├── objects/          # Опис астрономічних об'єктів
│   ├── m31.yml
│   ├── m42.yml
│   └── ...
├── sessions/         # Опис сесій зйомки
│   ├── 2024-11-10_m42_orion.yml
│   ├── 2025-10-03_m31_kharkiv.yml
│   └── ...
└── templates/        # Шаблони для нових файлів
    ├── object-template.yml
    └── session-template.yml
```

## Додавання нового об'єкта

### Спосіб 1: Інтерактивний CLI інструмент (рекомендовано)

Найпростіший спосіб - використати інтерактивний CLI:

```bash
node tools/add-gallery-item.mjs
```

Інструмент проведе вас через всі необхідні кроки і створить правильно відформатовані YAML файли.

### Спосіб 2: Використання шаблонів

Якщо ви вважаєте за краще створювати файли вручну:

1. **Створіть файл об'єкта:**
   ```bash
   cp data/templates/object-template.yml data/objects/your-object-id.yml
   ```

2. **Створіть файл сесії:**
   ```bash
   cp data/templates/session-template.yml data/sessions/YYYY-MM-DD_your-object-id.yml
   ```

3. **Заповніть всі поля** згідно з коментарями у шаблонах

4. **Перевірте валідність:**
   ```bash
   node tools/validate-yaml.mjs
   ```

## Валідація даних

Валідація виконується **автоматично при деплої** через GitHub Actions. Якщо YAML файли містять помилки, деплой буде скасовано.

Для перевірки локально (опціонально):

```bash
npm run validate
# або
node tools/validate-yaml.mjs
```

Скрипт перевірить:
- Наявність всіх обов'язкових полей
- Правильність типів даних
- Формат дат та значень
- Відповідність назв файлів конвенціям
- Посилання між об'єктами та сесіями

> **Примітка:** Валідація є частиною CI/CD процесу і виконується автоматично при push до main.

## Схема даних

### Object (об'єкт)

**Обов'язкові поля:**
- `id` (string) - Унікальний ідентифікатор (напр.: m31, ngc7380)
- `name` (string) - Українська назва
- `type` (string) - Тип об'єкта (Галактика, Туманність тощо)
- `constellation` (string) - Сузір'я
- `description` (string) - Короткий опис
- `credits` (string) - Авторство
- `license` (string) - Ліцензія

**Опціональні поля:**
- `aliases` (array) - Альтернативні назви
- `distance_ly` (number) - Відстань у світлових роках
- `extended_description` (string) - Розширений опис

### Session (сесія зйомки)

**Обов'язкові поля:**
- `object_id` (string) - ID об'єкта (повинен існувати в objects/)
- `date_utc` (string) - Дата у форматі YYYY-MM-DD
- `location` (string) - Місце зйомки
- `bortle` (number) - Bortle шкала (1-9)
- `camera` (string) - Модель камери
- `telescope` (string) - Модель телескопа
- `subs` (array) - Масив експозицій
- `calibration` (object) - Калібрувальні кадри
- `stacking_software` (string) - Софт для стекінгу
- `finals` (array) - Фінальні зображення

**Опціональні поля:**
- `sensor_temp_c` (number|null) - Температура сенсора
- `mount` (string) - Монтування
- `coma_corrector` (string) - Кома-коректор
- `filters` (array) - Фільтри
- `guiding` (object) - Налаштування гідування
- `processing_software` (array) - Софт для обробки
- `notes` (string) - Примітки

## Конвенції

### Назви файлів

**Objects:**
- Формат: `<object-id>.yml`
- Приклад: `m31.yml`, `ngc7380.yml`

**Sessions:**
- Формат: `YYYY-MM-DD_<object-id>_<optional-name>.yml`
- Приклад: `2024-11-10_m42_orion.yml`

### ID об'єктів

- Використовуйте малі літери
- Для Messier об'єктів: `m31`, `m42`
- Для NGC/IC: `ngc7380`, `ic1396`
- Для множинних об'єктів: `m81-m82`
- Без пробілів, тільки латинські літери та дефіси

## Приклади

Дивіться існуючі файли в `data/objects/` та `data/sessions/` для прикладів правильного форматування.

## Корисні посилання

- [YAML Syntax](https://yaml.org/spec/1.2/spec.html)
- [Messier Catalog](https://en.wikipedia.org/wiki/Messier_object)
- [NGC/IC Catalog](https://en.wikipedia.org/wiki/New_General_Catalogue)
- [Bortle Scale](https://en.wikipedia.org/wiki/Bortle_scale)
