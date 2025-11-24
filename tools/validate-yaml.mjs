#!/usr/bin/env node

/**
 * Validates YAML files in data/objects/ and data/sessions/
 * Usage: node tools/validate-yaml.mjs [--fix]
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Schema definitions
const objectSchema = {
  required: ['id', 'name', 'type', 'constellation', 'description', 'credits', 'license'],
  optional: ['aliases', 'distance_ly', 'extended_description'],
  types: {
    id: 'string',
    name: 'string',
    type: 'string',
    constellation: 'string',
    aliases: 'array',
    distance_ly: 'number',
    description: 'string',
    extended_description: 'string',
    credits: 'string',
    license: 'string'
  }
};

const sessionSchema = {
  required: ['object_id', 'date_utc', 'location', 'bortle', 'camera', 'telescope', 'subs', 'calibration', 'stacking_software', 'finals'],
  optional: ['sensor_temp_c', 'mount', 'coma_corrector', 'filters', 'guiding', 'processing_software', 'notes'],
  types: {
    object_id: 'string',
    date_utc: 'string',
    location: 'string',
    bortle: 'number',
    camera: 'string',
    sensor_temp_c: ['number', 'null'],
    mount: 'string',
    telescope: 'string',
    coma_corrector: 'string',
    filters: 'array',
    guiding: 'object',
    subs: 'array',
    calibration: 'object',
    stacking_software: 'string',
    processing_software: 'array',
    finals: 'array',
    notes: 'string'
  }
};

function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateField(fieldName, value, expectedType) {
  const actualType = getType(value);

  if (Array.isArray(expectedType)) {
    return expectedType.includes(actualType);
  }

  return actualType === expectedType;
}

function validateObject(data, schema, fileName) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in data)) {
      errors.push(`Відсутнє обов'язкове поле: ${field}`);
    } else if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Поле "${field}" не може бути порожнім`);
    } else {
      // Validate type
      const expectedType = schema.types[field];
      if (expectedType && !validateField(field, data[field], expectedType)) {
        errors.push(`Поле "${field}" має неправильний тип. Очікується: ${expectedType}, отримано: ${getType(data[field])}`);
      }
    }
  }

  // Check optional fields types
  for (const field of schema.optional) {
    if (field in data && data[field] !== undefined) {
      const expectedType = schema.types[field];
      if (expectedType && !validateField(field, data[field], expectedType)) {
        errors.push(`Поле "${field}" має неправильний тип. Очікується: ${expectedType}, отримано: ${getType(data[field])}`);
      }
    }
  }

  // Check for unknown fields
  const allKnownFields = [...schema.required, ...schema.optional];
  for (const field in data) {
    if (!allKnownFields.includes(field)) {
      warnings.push(`Невідоме поле: ${field}`);
    }
  }

  return { errors, warnings };
}

function validateSessionSpecific(data, fileName) {
  const errors = [];
  const warnings = [];

  // Validate date format
  if (data.date_utc) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date_utc)) {
      errors.push(`Дата має бути у форматі YYYY-MM-DD, отримано: ${data.date_utc}`);
    }
  }

  // Validate bortle scale
  if (data.bortle !== undefined && (data.bortle < 1 || data.bortle > 9)) {
    errors.push(`Bortle шкала має бути від 1 до 9, отримано: ${data.bortle}`);
  }

  // Validate subs array
  if (Array.isArray(data.subs)) {
    if (data.subs.length === 0) {
      errors.push('Масив subs не може бути порожнім');
    } else {
      data.subs.forEach((sub, idx) => {
        if (!sub.band) errors.push(`subs[${idx}]: відсутнє поле band`);
        if (!sub.iso) errors.push(`subs[${idx}]: відсутнє поле iso`);
        if (!sub.exposure_s) errors.push(`subs[${idx}]: відсутнє поле exposure_s`);
        if (!sub.count) errors.push(`subs[${idx}]: відсутнє поле count`);
      });
    }
  }

  // Validate finals array
  if (Array.isArray(data.finals)) {
    if (data.finals.length === 0) {
      errors.push('Масив finals не може бути порожнім');
    } else {
      data.finals.forEach((final, idx) => {
        if (!final.path) errors.push(`finals[${idx}]: відсутнє поле path`);
        if (!final.preview) errors.push(`finals[${idx}]: відсутнє поле preview`);
        if (!('plate_solved' in final)) warnings.push(`finals[${idx}]: відсутнє поле plate_solved`);
      });
    }
  }

  // Validate filename convention
  const expectedPrefix = data.date_utc?.replace(/-/g, '-') + '_' + data.object_id;
  const actualName = fileName.replace('.yml', '');
  if (!actualName.startsWith(expectedPrefix)) {
    warnings.push(`Назва файлу не відповідає конвенції: очікується ${expectedPrefix}_*.yml, отримано: ${fileName}`);
  }

  return { errors, warnings };
}

function validateObjectSpecific(data, fileName) {
  const warnings = [];

  // Validate filename matches id
  const expectedName = data.id + '.yml';
  if (fileName !== expectedName) {
    warnings.push(`Назва файлу не відповідає ID: очікується ${expectedName}, отримано: ${fileName}`);
  }

  return { errors: [], warnings };
}

async function validateFile(filePath, schema, type) {
  const fileName = filePath.split(/[/\\]/).pop();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = YAML.parse(content);

    if (!data || typeof data !== 'object') {
      return {
        file: fileName,
        valid: false,
        errors: ['Файл не містить валідного YAML об\'єкта'],
        warnings: []
      };
    }

    // General schema validation
    const { errors, warnings } = validateObject(data, schema, fileName);

    // Type-specific validation
    let specificValidation;
    if (type === 'session') {
      specificValidation = validateSessionSpecific(data, fileName);
    } else if (type === 'object') {
      specificValidation = validateObjectSpecific(data, fileName);
    }

    const allErrors = [...errors, ...specificValidation.errors];
    const allWarnings = [...warnings, ...specificValidation.warnings];

    return {
      file: fileName,
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  } catch (error) {
    return {
      file: fileName,
      valid: false,
      errors: [`Помилка парсингу YAML: ${error.message}`],
      warnings: []
    };
  }
}

async function getAllFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter(f => f.endsWith('.yml') && !f.includes('template'))
      .map(f => join(dir, f));
  } catch (error) {
    return [];
  }
}

async function main() {
  log('\n🔍 Валідація YAML файлів галереї\n', 'cyan');

  const objectFiles = await getAllFiles(join(ROOT_DIR, 'data', 'objects'));
  const sessionFiles = await getAllFiles(join(ROOT_DIR, 'data', 'sessions'));

  let totalErrors = 0;
  let totalWarnings = 0;

  // Validate objects
  if (objectFiles.length > 0) {
    log('📡 Перевірка об\'єктів:', 'bright');
    for (const file of objectFiles) {
      const result = await validateFile(file, objectSchema, 'object');

      if (result.valid && result.warnings.length === 0) {
        log(`  ✓ ${result.file}`, 'green');
      } else {
        if (result.errors.length > 0) {
          log(`  ✗ ${result.file}`, 'red');
          result.errors.forEach(err => log(`    • ${err}`, 'red'));
          totalErrors += result.errors.length;
        } else {
          log(`  ⚠ ${result.file}`, 'yellow');
        }

        if (result.warnings.length > 0) {
          result.warnings.forEach(warn => log(`    ⚠ ${warn}`, 'yellow'));
          totalWarnings += result.warnings.length;
        }
      }
    }
    console.log();
  }

  // Validate sessions
  if (sessionFiles.length > 0) {
    log('📸 Перевірка сесій:', 'bright');
    for (const file of sessionFiles) {
      const result = await validateFile(file, sessionSchema, 'session');

      if (result.valid && result.warnings.length === 0) {
        log(`  ✓ ${result.file}`, 'green');
      } else {
        if (result.errors.length > 0) {
          log(`  ✗ ${result.file}`, 'red');
          result.errors.forEach(err => log(`    • ${err}`, 'red'));
          totalErrors += result.errors.length;
        } else {
          log(`  ⚠ ${result.file}`, 'yellow');
        }

        if (result.warnings.length > 0) {
          result.warnings.forEach(warn => log(`    ⚠ ${warn}`, 'yellow'));
          totalWarnings += result.warnings.length;
        }
      }
    }
    console.log();
  }

  // Summary
  log('───────────────────────────────────', 'cyan');
  log(`Перевірено файлів: ${objectFiles.length + sessionFiles.length}`, 'bright');

  if (totalErrors === 0 && totalWarnings === 0) {
    log('Результат: ✓ Всі файли валідні', 'green');
    process.exit(0);
  } else {
    if (totalErrors > 0) {
      log(`Помилок: ${totalErrors}`, 'red');
    }
    if (totalWarnings > 0) {
      log(`Попереджень: ${totalWarnings}`, 'yellow');
    }

    if (totalErrors > 0) {
      log('\n❌ Валідація не пройдена', 'red');
      process.exit(1);
    } else {
      log('\n⚠️  Валідація пройдена з попередженнями', 'yellow');
      process.exit(0);
    }
  }
}

main().catch(error => {
  log(`\n❌ Критична помилка: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
