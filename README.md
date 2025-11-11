# Astro Gallery

Колекція моїх астрофото: фінальні зображення, стеки, метадані та статичний сайт (GitHub Pages).

## Як працювати
1. Поклади фінальні зображення у `images/<object>/final` (TIFF/PNG/JPG).
2. Заповни метадані у `data/objects/*.yml` та `data/sessions/*.yml`.
3. Запусти `tools/make_thumbs.py` (створить прев’ю у `thumbnails/`). 
4. Push — GitHub Actions збере сайт і задеплоїть його на Pages.

## Ліцензії
- Зображення: CC BY-NC 4.0 (див. LICENSE-images.md)
- Код: MIT (див. LICENSE-code)

## Технічний стек
- Git LFS для великих файлів (TIFF/FITS/RAW).
- Astro (статичний сайт) + невеликий генератор контенту.
- GitHub Actions для збірки та деплою.
