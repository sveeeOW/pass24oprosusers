/****************************************************
 * PASS24.online — Опрос пользователей
 * Google Apps Script + Google Sheets
 *
 * Script ID: 1M9_d6LGViAgBquXEwNhWkpo1jqiDhWAdJ1dIodIQHNhscoxU0wS7SSA4
 * Web App URL: https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
 *
 * После каждой правки: Deploy → Manage deployments → Edit → New version → Deploy
 ****************************************************/

const SHEET_NAME = 'Ответы';
const ADMIN_TOKEN = 'pass24opros24';

// Если скрипт создан через «Расширения → Apps Script» внутри таблицы, оставь пустым.
const SPREADSHEET_ID = '';

const HEADERS = [
  'Дата отправки',
  'Имя',
  'Название объекта',
  'Тип объекта',
  'Роль пользователя',
  'NPS',
  'Причина оценки NPS',
  'Чего не хватает',
  'Что неудобно',
  'Знает про Telegram-бота',
  'Пользуется Telegram-ботом',
  'Выбранные доработки',
  'Оценки CSAT',
  'Оценки CSI',
  'Средний CSAT',
  'Средняя важность функций',
  'Средняя удобность функций',
  'Полный JSON ответа'
];

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'ping';

    if (action === 'ping') {
      const ss = getSpreadsheet();
      return jsonResponse({
        ok: true,
        message: 'PASS24 users survey Apps Script is working',
        spreadsheetName: ss.getName(),
        sheetName: SHEET_NAME
      });
    }

    if (action === 'getResponses' || action === 'getResults' || action === 'results') {
      if (params.token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      return jsonResponse({ ok: true, data: getResponses() });
    }

    // Для админских действий используем GET: он стабильнее в Apps Script Web App,
    // потому что POST иногда уходит через redirect и Google возвращает HTML 405.
    if (action === 'seedDemo' || action === 'addDemo' || action === 'demo' || action === 'demoData') {
      if (params.token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      const sheet = getSheet();
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const demo = buildDemoResponses();
        demo.forEach(item => sheet.appendRow(responseToRow(normalizeResponse(item))));
        return jsonResponse({ ok: true, message: 'Demo responses added', count: demo.length });
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'clearResponses' || action === 'clear') {
      if (params.token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      clearResponses();
      return jsonResponse({ ok: true, message: 'Responses cleared' });
    }

    if (action === 'debugWrite') {
      if (params.token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      appendResponse(normalizeResponse({
        name: 'DEBUG',
        objectName: 'DEBUG',
        objectType: 'DEBUG',
        role: 'DEBUG',
        nps: 10,
        npsReason: 'Debug write test',
        missing: '',
        problems: '',
        tgKnow: 'Нет',
        tgUse: '',
        improvements: [],
        csat: [],
        csi: []
      }));
      return jsonResponse({ ok: true, message: 'Debug row added' });
    }

    return jsonResponse({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: getErrorMessage(err) });
  }
}

function doPost(e) {
  try {
    const request = parseRequest(e);
    const action = request.action || 'addResponse';
    const body = request.body || {};

    if (action === 'addResponse' || action === 'submitSurvey' || action === 'submit') {
      const normalized = normalizeResponse(body);
      validateResponse(normalized);
      appendResponse(normalized);
      return jsonResponse({ ok: true, message: 'Response saved' });
    }

    if (action === 'seedDemo' || action === 'addDemo' || action === 'demo' || action === 'demoData') {
      const sheet = getSheet();
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const demo = buildDemoResponses();
        demo.forEach(item => sheet.appendRow(responseToRow(normalizeResponse(item))));
        return jsonResponse({ ok: true, message: 'Demo responses added', count: demo.length });
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'debugWrite') {
      appendResponse(normalizeResponse({
        name: 'DEBUG',
        objectName: 'DEBUG',
        objectType: 'DEBUG',
        role: 'DEBUG',
        nps: 10,
        npsReason: 'Debug write test',
        missing: '',
        problems: '',
        tgKnow: 'Нет',
        tgUse: '',
        improvements: [],
        csat: [],
        csi: []
      }));
      return jsonResponse({ ok: true, message: 'Debug row added' });
    }

    if (action === 'clearResponses' || action === 'clear') {
      const token = request.token || body.token || '';
      if (token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      clearResponses();
      return jsonResponse({ ok: true, message: 'Responses cleared' });
    }

    return jsonResponse({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: getErrorMessage(err) });
  }
}

function parseRequest(e) {
  const params = e && e.parameter ? e.parameter : {};
  const postData = e && e.postData ? e.postData.contents : '';

  let payload = {};

  if (params.payload) {
    payload = parseJson(params.payload, {});
  }

  if (!Object.keys(payload).length && postData) {
    payload = parseJson(postData, {});
  }

  const directFields = {};
  ['name', 'objectName', 'objectType', 'role', 'nps', 'npsReason', 'missing', 'problems', 'tgKnow', 'tgUse'].forEach(key => {
    if (params[key] !== undefined) directFields[key] = params[key];
  });
  ['improvements', 'csat', 'csi'].forEach(key => {
    if (params[key] !== undefined) directFields[key] = parseJson(params[key], []);
  });

  const body = Object.assign({}, payload, directFields);

  return {
    action: params.action || payload.action || '',
    token: params.token || payload.token || '',
    body: body
  };
}

function normalizeResponse(body) {
  if (typeof body === 'string') body = parseJson(body, {});
  if (!body || typeof body !== 'object') body = {};

  const npsValue = body.nps === '' || body.nps === null || body.nps === undefined ? null : Number(body.nps);

  return {
    name: body.name || '',
    objectName: body.objectName || body.object_name || '',
    objectType: body.objectType || body.object_type || '',
    role: body.role || '',
    nps: npsValue,
    npsReason: body.npsReason || body.nps_reason || '',
    missing: body.missing || '',
    problems: body.problems || '',
    tgKnow: body.tgKnow || body.tg_know || '',
    tgUse: body.tgUse || body.tg_use || '',
    improvements: Array.isArray(body.improvements) ? body.improvements : parseJson(body.improvements, []),
    csat: Array.isArray(body.csat) ? body.csat : parseJson(body.csat, []),
    csi: Array.isArray(body.csi) ? body.csi : parseJson(body.csi, []),
    raw: body
  };
}

function validateResponse(body) {
  const missing = [];
  if (!body.name) missing.push('name');
  if (!body.objectName) missing.push('objectName');
  if (body.nps === null || body.nps === undefined || isNaN(body.nps)) missing.push('nps');

  if (missing.length) {
    throw new Error('Required fields are missing: ' + missing.join(', ') + '. Received: ' + JSON.stringify({
      name: body.name,
      objectName: body.objectName,
      nps: body.nps
    }));
  }
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Скрипт не привязан к Google Sheet. Создай Apps Script через «Расширения → Apps Script» внутри таблицы или укажи SPREADSHEET_ID.');
  }
  return active;
}

function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = range.getValues()[0];
  const ok = HEADERS.every((header, index) => current[index] === header);

  if (!ok) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function appendResponse(payload) {
  payload = normalizeResponse(payload);
  validateResponse(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet().appendRow(responseToRow(payload));
  } finally {
    lock.releaseLock();
  }
}

function getResponses() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map(rowToResponse)
    .reverse();
}

function clearResponses() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
}

function responseToRow(body) {
  const csat = Array.isArray(body.csat) ? body.csat : [];
  const csi = Array.isArray(body.csi) ? body.csi : [];
  const improvements = Array.isArray(body.improvements) ? body.improvements : [];

  return [
    new Date().toISOString(),
    body.name || '',
    body.objectName || '',
    body.objectType || '',
    body.role || '',
    body.nps ?? '',
    body.npsReason || '',
    body.missing || '',
    body.problems || '',
    body.tgKnow || '',
    body.tgUse || '',
    JSON.stringify(improvements),
    JSON.stringify(csat),
    JSON.stringify(csi),
    avg(csat.map(item => item && item.value)),
    avg(csi.map(item => item && item.importance)),
    avg(csi.map(item => item && item.satisfaction)),
    JSON.stringify(body.raw || body)
  ];
}

function rowToResponse(row) {
  return {
    date: row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'dd.MM.yyyy, HH:mm:ss') : '',
    name: row[1] || '',
    objectName: row[2] || '',
    objectType: row[3] || '',
    role: row[4] || '',
    nps: row[5] === '' ? null : Number(row[5]),
    npsReason: row[6] || '',
    missing: row[7] || '',
    problems: row[8] || '',
    tgKnow: row[9] || '',
    tgUse: row[10] || '',
    improvements: parseJson(row[11], []),
    csat: parseJson(row[12], []),
    csi: parseJson(row[13], [])
  };
}

function buildDemoResponses() {
  const csatQuestions = [
    'Удобство создания гостевого пропуска',
    'Скорость оформления пропуска (от открытия до готового пропуска)',
    'Удобство приглашения гостя с автомобилем (автопропуск)',
    'Стабильность работы приложения (без сбоев и зависаний)',
    'Понятность интерфейса (легко найти нужное действие)',
    'Дизайн интерфейса',
    'Уведомления о статусе пропуска и проходе гостя',
    'Приложение в целом — насколько вы им довольны'
  ];

  const csiQuestions = [
    'Быстрота создания пропуска',
    'Разные типы доступа (пешеход, авто, курьер, подрядчик)',
    'Создание постоянного пропуска',
    'Отправка приглашения гостю (QR-код, ссылка или SMS/мессенджер)',
    'Установка даты и времени действия пропуска',
    'Уведомление о проходе / въезде гостя в реальном времени',
    'История пропусков с поиском',
    'Редактирование и отмена пропуска после создания',
    'Работа без звонков охране — самостоятельное управление доступом'
  ];

  return [
    {
      name: 'Марина', objectName: 'КП Берёзовый', objectType: 'Коттеджный поселок', role: 'Житель / владелец',
      nps: 9, npsReason: 'Очень удобно звать гостей без звонков охране',
      missing: 'Хочу виджет на экране телефона', problems: 'Иногда приходится долго искать пункт меню',
      tgKnow: 'Да', tgUse: 'Да, иногда',
      improvements: ['Быстрый повтор предыдущего пропуска', 'Виджет / ярлык на главном экране телефона'],
      csat: csatQuestions.map(q => ({ question: q, value: randomInt(4, 5) })),
      csi: csiQuestions.map(q => ({ question: q, importance: randomInt(4, 5), satisfaction: randomInt(3, 4) }))
    },
    {
      name: 'Дмитрий', objectName: 'БЦ Горизонт', objectType: 'Бизнес-центр', role: 'Сотрудник / арендатор',
      nps: 7, npsReason: 'В целом нормально, но не хватает шаблонов',
      missing: 'Шаблоны для повторных гостей', problems: 'Уведомления приходят с опозданием',
      tgKnow: 'Нет', tgUse: '',
      improvements: ['Шаблоны для частых гостей (родственники, курьеры)', 'Перенести заказ постоянного пропуска из «Запросов» в раздел заказа пропусков'],
      csat: csatQuestions.map(q => ({ question: q, value: randomInt(3, 4) })),
      csi: csiQuestions.map(q => ({ question: q, importance: randomInt(3, 5), satisfaction: randomInt(3, 4) }))
    },
    {
      name: 'Ольга', objectName: 'ЖК Солнечный', objectType: 'Жилой комплекс', role: 'Житель / владелец',
      nps: 10, npsReason: 'Лучшее решение — уже рекомендовала соседям',
      missing: '', problems: '', tgKnow: 'Да', tgUse: 'Да, регулярно',
      improvements: ['Возможность просмотра камер видеонаблюдения на КПП'],
      csat: csatQuestions.map(q => ({ question: q, value: 5 })),
      csi: csiQuestions.map(q => ({ question: q, importance: 5, satisfaction: randomInt(4, 5) }))
    }
  ];
}

function avg(values) {
  const clean = values.map(Number).filter(value => !isNaN(value));
  if (!clean.length) return '';
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(2));
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value || fallback;
  try { return JSON.parse(value) || fallback; } catch (err) { return fallback; }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getErrorMessage(err) {
  return String(err && err.message ? err.message : err);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testAppendResponse() {
  appendResponse({
    name: 'Тест',
    objectName: 'Тестовый объект',
    objectType: 'Коттеджный поселок',
    role: 'Житель / владелец',
    nps: 10,
    npsReason: 'Тестовая запись',
    missing: '',
    problems: '',
    tgKnow: 'Нет',
    tgUse: '',
    improvements: [],
    csat: [],
    csi: []
  });
}
