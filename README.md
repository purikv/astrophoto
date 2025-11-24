# Astro Gallery

[![Build & Deploy](https://github.com/purikv/astrophoto/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/purikv/astrophoto/actions/workflows/build-and-deploy.yml)

Колекція моїх астрофото: фінальні зображення, стеки, метадані та статичний сайт (GitHub Pages).

## Швидкий старт

### Додавання нового астрофото

**Найпростіший спосіб** - використати інтерактивний CLI:

```bash
npm run add
```

Інструмент автоматично:
- Запитає всі необхідні дані про об'єкт та сесію зйомки
- Створить правильно відформатовані YAML файли
- Перевірить коректність даних
- Підкаже наступні кроки

### Повний процес

1. **Додайте зображення:** Покладіть фінальні зображення у `images/<object>/final/` (TIFF/PNG/JPG)
2. **Створіть метадані:** Запустіть `npm run add` або вручну створіть YAML файли з шаблонів
3. **Перевірте локально:** `cd site && npm run dev` (опціонально)
4. **Commit & Push:** `git add . && git commit -m "..." && git push`

GitHub Actions **автоматично** виконає:
- ✅ Валідацію YAML файлів (`npm run validate`)
- ✅ Генерацію thumbnails (`npm run thumbs`)
- ✅ Генерацію gallery.json (`npm run generate`)
- ✅ Збірку та деплой сайту на Pages

Якщо валідація не пройде, деплой буде скасовано.

### Корисні команди (для локальної розробки)

```bash
npm run add        # Інтерактивне додавання нового об'єкта/сесії
npm run validate   # Перевірка валідності YAML (виконується автоматично в CI)
npm run thumbs     # Генерація thumbnails (виконується автоматично в CI)
npm run generate   # Генерація gallery.json (виконується автоматично в CI)
```

> **Примітка:** Команди validate, thumbs та generate виконуються автоматично при push до main, тому запускати їх локально не обов'язково.

## Структура проекту

```
├── data/
│   ├── objects/       # Метадані астрономічних об'єктів
│   ├── sessions/      # Метадані сесій зйомки
│   └── templates/     # Шаблони для нових файлів
├── images/            # Фінальні зображення (в git)
├── thumbnails/        # Автоматично згенеровані превью
├── tools/             # CLI інструменти
│   ├── add-gallery-item.mjs      # Інтерактивне додавання
│   ├── validate-yaml.mjs         # Валідація метаданих
│   ├── make-thumbs.mjs           # Генерація превью
│   └── generate-gallery-json.mjs # Генерація даних для сайту
└── site/              # Astro статичний сайт
```

Детальна документація: [data/README.md](data/README.md)

## Ліцензії
- Зображення: CC BY-NC 4.0 (див. LICENSE-images.md)
- Код: MIT (див. LICENSE-code)

## Технічний стек
- Git LFS для великих файлів (TIFF/FITS/RAW).
- Astro (статичний сайт) + невеликий генератор контенту.
- GitHub Actions для збірки та деплою.
