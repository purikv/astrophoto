#!/usr/bin/env node

/**
 * Interactive CLI tool for adding new astrophotography objects and sessions
 * Usage: node tools/add-gallery-item.mjs
 */

import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ANSI colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function header(text) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + colors.cyan + text + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(60) + colors.reset + '\n');
}

async function promptWithDefault(prompt, defaultValue = '', required = false) {
  const displayPrompt = defaultValue
    ? `${prompt} ${colors.yellow}[${defaultValue}]${colors.reset}: `
    : `${prompt}: `;

  const answer = await question(displayPrompt);
  const value = answer.trim() || defaultValue;

  if (required && !value) {
    log('⚠ Це поле обов\'язкове!', 'yellow');
    return promptWithDefault(prompt, defaultValue, required);
  }

  return value;
}

async function promptYesNo(prompt, defaultValue = true) {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await question(`${prompt} ${colors.yellow}[${defaultText}]${colors.reset}: `);

  if (!answer.trim()) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

async function promptNumber(prompt, defaultValue = null, required = false) {
  const answer = await promptWithDefault(prompt, defaultValue?.toString() || '', required);

  if (!answer) return null;

  const num = parseFloat(answer);
  if (isNaN(num)) {
    log('⚠ Введіть коректне число!', 'yellow');
    return promptNumber(prompt, defaultValue, required);
  }

  return num;
}

async function promptArray(prompt, example = '') {
  const exampleText = example ? ` ${colors.blue}(напр.: ${example})${colors.reset}` : '';
  const answer = await question(`${prompt}${exampleText}: `);

  if (!answer.trim()) return [];

  return answer.split(',').map(item => item.trim()).filter(Boolean);
}

async function collectObjectData() {
  header('📡 СТВОРЕННЯ НОВОГО ОБ\'ЄКТА');

  log('Введіть дані про астрономічний об\'єкт:\n', 'cyan');

  const id = await promptWithDefault(
    'ID об\'єкта (напр.: m31, ngc7380)',
    '',
    true
  );

  const name = await promptWithDefault(
    'Українська назва',
    '',
    true
  );

  const type = await promptWithDefault(
    'Тип об\'єкта (напр.: Галактика, Туманність)',
    'Туманність',
    true
  );

  const constellation = await promptWithDefault(
    'Сузір\'я',
    '',
    true
  );

  const aliases = await promptArray(
    'Альтернативні назви (через кому)',
    'Messier 31, M31, NGC 224'
  );

  const distance_ly = await promptNumber(
    'Відстань у світлових роках',
    null,
    false
  );

  const description = await promptWithDefault(
    'Короткий опис',
    '',
    true
  );

  const extended_description = await promptWithDefault(
    'Розширений опис (опціонально)',
    ''
  );

  const credits = await promptWithDefault(
    'Авторство',
    '© Володимир Пурик'
  );

  const license = await promptWithDefault(
    'Ліцензія',
    'CC BY-NC 4.0'
  );

  return {
    id,
    name,
    type,
    constellation,
    aliases: aliases.length > 0 ? aliases : undefined,
    distance_ly: distance_ly || undefined,
    description,
    extended_description: extended_description || undefined,
    credits,
    license
  };
}

async function collectSessionData(objectId) {
  header('📸 СТВОРЕННЯ СЕСІЇ ЗЙОМКИ');

  log(`Введіть дані про сесію зйомки для об'єкта: ${colors.green}${objectId}${colors.reset}\n`, 'cyan');

  const date_utc = await promptWithDefault(
    'Дата зйомки UTC (YYYY-MM-DD)',
    new Date().toISOString().split('T')[0],
    true
  );

  const location = await promptWithDefault(
    'Місце зйомки',
    'Dnipropetrovska oblast, UA'
  );

  const bortle = await promptNumber(
    'Bortle шкала (1-9)',
    5,
    true
  );

  log('\n' + colors.magenta + '🔭 ОБЛАДНАННЯ' + colors.reset, 'magenta');

  const camera = await promptWithDefault(
    'Камера',
    'Canon 450D (mod)',
    true
  );

  const sensor_temp_c = await promptNumber(
    'Температура сенсора °C (Enter для пропуску)',
    null
  );

  const mount = await promptWithDefault(
    'Монтування',
    'AZ-EQ5 GT'
  );

  const telescope = await promptWithDefault(
    'Телескоп',
    'Arsenal GSO 203/1000 N (f/5)',
    true
  );

  const coma_corrector = await promptWithDefault(
    'Кома-коректор (Enter для пропуску)',
    'TS GPU CC'
  );

  const filters = await promptArray(
    'Фільтри (через кому)',
    'UV IR-cut Anti-Halo'
  );

  // Guiding
  const useGuiding = await promptYesNo('Використовувалось гідування?', true);
  let guiding = null;

  if (useGuiding) {
    log('\n' + colors.blue + '🎯 ГІДУВАННЯ' + colors.reset, 'blue');
    const guidingCamera = await promptWithDefault('Камера гідування', 'ZWO ASI 120 M');
    const guidingSoftware = await promptWithDefault('Софт для гідування', 'PHD2');
    const rms_arcsec = await promptNumber('RMS помилка (arcsec, Enter для пропуску)', null);

    guiding = {
      camera: guidingCamera,
      software: guidingSoftware,
      rms_arcsec: rms_arcsec || null
    };
  }

  // Sub-exposures
  log('\n' + colors.green + '📷 КАДРИ' + colors.reset, 'green');
  const subs = [];
  let addMoreSubs = true;

  while (addMoreSubs) {
    const band = await promptWithDefault('Діапазон (Luminance, RGB, Ha, OIII, SII)', 'Luminance', true);
    const iso = await promptNumber('ISO', 800, true);
    const exposure_s = await promptNumber('Експозиція (секунди)', 300, true);
    const count = await promptNumber('Кількість кадрів', 1, true);

    subs.push({ band, iso, exposure_s, count });

    addMoreSubs = await promptYesNo('Додати ще один набір кадрів?', false);
  }

  // Calibration
  log('\n' + colors.yellow + '⚙️  КАЛІБРУВАЛЬНІ КАДРИ' + colors.reset, 'yellow');

  const bias = await promptNumber('Кількість bias кадрів', 60, false);

  const darkExposure = await promptNumber('Експозиція dark кадрів (секунди)', 300, false);
  const darkCount = await promptNumber('Кількість dark кадрів', 28, false);
  const darkTemp = await promptNumber('Температура dark кадрів °C (Enter для пропуску)', null);

  const flatCount = await promptNumber('Кількість flat кадрів', 60, false);
  const flatMethod = await promptWithDefault('Метод отримання flat', 'flat panel');

  const calibration = {
    bias: bias || undefined,
    darks: darkCount ? {
      exposure_s: darkExposure,
      count: darkCount,
      temp_c: darkTemp || null
    } : undefined,
    flats: flatCount ? {
      count: flatCount,
      method: flatMethod
    } : undefined
  };

  // Processing
  log('\n' + colors.magenta + '💻 ОБРОБКА' + colors.reset, 'magenta');

  const stacking_software = await promptWithDefault(
    'Софт для стекінгу',
    'Siril 1.4',
    true
  );

  const processing_software = await promptArray(
    'Софт для обробки (через кому)',
    'Siril, GraXpert'
  );

  // Finals
  log('\n' + colors.cyan + '🖼️  ФІНАЛЬНІ ЗОБРАЖЕННЯ' + colors.reset, 'cyan');

  const imagePath = await promptWithDefault(
    'Шлях до фінального зображення',
    `images/${objectId}/final/`,
    true
  );

  const previewPath = await promptWithDefault(
    'Шлях до превью',
    `thumbnails/${objectId}_800.jpg`,
    true
  );

  const plate_solved = await promptYesNo('Plate solving виконано?', true);

  const finals = [{
    path: imagePath,
    preview: previewPath,
    plate_solved
  }];

  const notes = await promptWithDefault(
    'Примітки (опціонально)',
    ''
  );

  return {
    object_id: objectId,
    date_utc,
    location,
    bortle,
    camera,
    sensor_temp_c: sensor_temp_c || null,
    mount: mount || undefined,
    telescope,
    coma_corrector: coma_corrector || undefined,
    filters: filters.length > 0 ? filters : undefined,
    guiding: guiding || undefined,
    subs,
    calibration,
    stacking_software,
    processing_software: processing_software.length > 0 ? processing_software : undefined,
    finals,
    notes: notes || undefined
  };
}

async function saveYamlFile(data, filePath) {
  const yamlContent = YAML.stringify(data, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN'
  });

  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, yamlContent, 'utf-8');

  log(`✅ Файл збережено: ${filePath}`, 'green');
}

async function main() {
  try {
    log('\n' + colors.bright + '🌌 Додавання нового об\'єкта до галереї' + colors.reset + '\n', 'bright');

    const createObject = await promptYesNo('Створити новий об\'єкт?', true);
    let objectId;

    if (createObject) {
      const objectData = await collectObjectData();
      objectId = objectData.id;

      const objectFilePath = join(ROOT_DIR, 'data', 'objects', `${objectId}.yml`);

      // Check if file exists
      try {
        await fs.access(objectFilePath);
        const overwrite = await promptYesNo(`⚠️  Файл ${objectId}.yml вже існує. Перезаписати?`, false);
        if (!overwrite) {
          log('❌ Скасовано користувачем', 'yellow');
          rl.close();
          return;
        }
      } catch (err) {
        // File doesn't exist, continue
      }

      await saveYamlFile(objectData, objectFilePath);
    } else {
      objectId = await promptWithDefault('ID існуючого об\'єкта', '', true);
    }

    log('');
    const createSession = await promptYesNo('Створити сесію зйомки?', true);

    if (createSession) {
      const sessionData = await collectSessionData(objectId);
      const dateStr = sessionData.date_utc;
      const sessionFileName = `${dateStr}_${objectId}.yml`;
      const sessionFilePath = join(ROOT_DIR, 'data', 'sessions', sessionFileName);

      // Check if file exists
      try {
        await fs.access(sessionFilePath);
        const overwrite = await promptYesNo(`⚠️  Файл ${sessionFileName} вже існує. Перезаписати?`, false);
        if (!overwrite) {
          log('❌ Скасовано користувачем', 'yellow');
          rl.close();
          return;
        }
      } catch (err) {
        // File doesn't exist, continue
      }

      await saveYamlFile(sessionData, sessionFilePath);
    }

    log('\n' + colors.green + colors.bright + '🎉 Готово!' + colors.reset, 'green');
    log('\nНаступні кроки:', 'cyan');
    log('1. Додайте фінальне зображення у вказану директорію', 'blue');
    log('2. Запустіть: node tools/make-thumbs.mjs', 'blue');
    log('3. Перевірте: cd site && npm run dev', 'blue');
    log('4. Закомітьте зміни і push до main\n', 'blue');

  } catch (error) {
    log(`\n❌ Помилка: ${error.message}`, 'yellow');
    console.error(error);
  } finally {
    rl.close();
  }
}

main();
