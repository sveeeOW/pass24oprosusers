/**
 * PASS24.online — Опрос пользователей
 * Google Apps Script Web App для сохранения и чтения ответов из Google Sheets.
 *
 * Script ID: 1M9_d6LGViAgBquXEwNhWkpo1jqiDhWAdJ1dIodIQHNhscoxU0wS7SSA4
 * Web App URL: https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
 *
 * Важно:
 * После каждой правки кода нужно сделать Deploy → Manage deployments → Edit → New version → Deploy.
 */

const SHEET_NAME = 'Ответы';
const ADMIN_TOKEN = 'pass24opros24';

// Если скрипт НЕ привязан к таблице, вставь сюда ID Google Sheet.
// Если скрипт создан через «Расширения → Apps Script» внутри таблицы, оставь пустым.
const SPREADSHEET_ID = '';

const HEADERS = [
  'created_at',
  'name',
  'object_name',
  'object_type',
  'role',
  'nps',
  'nps_reason',
  'missing',
  'problems',
  'tg_know',
  'tg_use',
  'improvements_json',
  'csat_json',
  'csi_json',
  'csat_avg',
  'csi_importance_avg',
  'csi_satisfaction_avg',
  'raw_json'
];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';

    if (action === 'ping') {
      const ss = getSpreadsheet();
      return jsonResponse({
        ok: true,
        message: 'PASS24 users survey Apps Script is working',
        spreadsheetName: ss.getName(),
        sheetName: SHEET_NAME
      });
    }

    if (action === 'getResponses') {
      const token = (e.parameter && e.parameter.token) || '';
      if (token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      return jsonResponse({ ok: true, data: getResponses() });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: getErrorMessage(err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const action = body.action || 'addResponse';

    if (action === 'addResponse') {
      const payload = normalizePayload(body.payload || body);
      appendResponse(payload);
      return jsonResponse({ ok: true });
    }

    if (action === 'clearResponses') {
      const token = body.token || '';
      if (token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      clearResponses();
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: getErrorMessage(err) });
  }
}

function parseBody(e) {
  // Основной формат из Vercel: application/x-www-form-urlencoded.
  // В нём есть action, payload и продублированные поля name/objectName/nps.
  if (e && e.parameter && Object.keys(e.parameter).length) {
    const params = e.parameter;
    let payload = parseJson(params.payload, null);

    // Если payload по какой-то причине не разобрался, собираем объект из прямых полей.
    if (!payload || typeof payload !== 'object' || !Object.keys(payload).length) {
      payload = buildPayloadFromParams(params);
    }

    return {
      action: params.action || 'addResponse',
      token: params.token || '',
      payload: payload
    };
  }

  // Запасной формат: raw JSON/text/plain.
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    const parsed = JSON.parse(e.postData.contents);
    if (parsed && parsed.payload) {
      parsed.payload = normalizePayload(parsed.payload);
    }
    return parsed || {};
  } catch (err) {
    throw new Error('Не удалось разобрать POST-запрос: ' + err.message);
  }
}

function buildPayloadFromParams(params) {
  return {
    name: params.name || '',
    objectName: params.objectName || params.object_name || '',
    objectType: params.objectType || params.object_type || '',
    role: params.role || '',
    nps: parseNumberOrString(params.nps),
    npsReason: params.npsReason || params.nps_reason || '',
    missing: params.missing || '',
    problems: params.problems || '',
    tgKnow: params.tgKnow || params.tg_know || '',
    tgUse: params.tgUse || params.tg_use || '',
    improvements: parseJson(params.improvements, []),
    csat: parseJson(params.csat, []),
    csi: parseJson(params.csi, [])
  };
}

function normalizePayload(payload) {
  if (typeof payload === 'string') {
    payload = parseJson(payload, {});
  }

  if (!payload || typeof payload !== 'object') payload = {};

  if (typeof payload.improvements === 'string') payload.improvements = parseJson(payload.improvements, []);
  if (typeof payload.csat === 'string') payload.csat = parseJson(payload.csat, []);
  if (typeof payload.csi === 'string') payload.csi = parseJson(payload.csi, []);
  if (payload.nps !== '' && payload.nps !== null && payload.nps !== undefined) payload.nps = Number(payload.nps);

  return payload;
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Скрипт не привязан к Google Sheet. Создай Apps Script через «Расширения → Apps Script» внутри таблицы или укажи SPREADSHEET_ID в Code.gs.');
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
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const ok = HEADERS.every((header, index) => current[index] === header);

  if (!ok) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function appendResponse(payload) {
  payload = normalizePayload(payload);

  if (!payload || !payload.name || !payload.objectName || payload.nps === null || payload.nps === undefined || payload.nps === '' || isNaN(Number(payload.nps))) {
    throw new Error('Required fields are missing: name, objectName или nps. Получены поля: ' + JSON.stringify(Object.keys(payload || {})));
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    sheet.appendRow(responseToRow(payload));
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

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }
}

function responseToRow(payload) {
  const csat = Array.isArray(payload.csat) ? payload.csat : [];
  const csi = Array.isArray(payload.csi) ? payload.csi : [];
  const improvements = Array.isArray(payload.improvements) ? payload.improvements : [];

  return [
    new Date().toISOString(),
    payload.name || '',
    payload.objectName || '',
    payload.objectType || '',
    payload.role || '',
    payload.nps ?? '',
    payload.npsReason || '',
    payload.missing || '',
    payload.problems || '',
    payload.tgKnow || '',
    payload.tgUse || '',
    JSON.stringify(improvements),
    JSON.stringify(csat),
    JSON.stringify(csi),
    avg(csat.map(item => item && item.value)),
    avg(csi.map(item => item && item.importance)),
    avg(csi.map(item => item && item.satisfaction)),
    JSON.stringify(payload)
  ];
}

function rowToResponse(row) {
  const values = {};
  HEADERS.forEach((header, index) => {
    values[header] = row[index] || '';
  });

  return {
    date: values.created_at ? Utilities.formatDate(new Date(values.created_at), Session.getScriptTimeZone(), 'dd.MM.yyyy, HH:mm:ss') : '',
    name: values.name || '',
    objectName: values.object_name || '',
    objectType: values.object_type || '',
    role: values.role || '',
    nps: values.nps === '' ? null : Number(values.nps),
    npsReason: values.nps_reason || '',
    missing: values.missing || '',
    problems: values.problems || '',
    tgKnow: values.tg_know || '',
    tgUse: values.tg_use || '',
    improvements: parseJson(values.improvements_json, []),
    csat: parseJson(values.csat_json, []),
    csi: parseJson(values.csi_json, [])
  };
}

function avg(values) {
  const clean = values.map(Number).filter(value => !isNaN(value));
  if (!clean.length) return '';
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(2));
}

function parseNumberOrString(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  return isNaN(num) ? value : num;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value || fallback;

  try {
    return JSON.parse(value) || fallback;
  } catch (e) {
    return fallback;
  }
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
    name: 'Тестовый пользователь',
    objectName: 'Тестовый объект',
    objectType: 'Коттеджный поселок',
    role: 'Житель / владелец',
    nps: 10,
    npsReason: 'Тестовая запись',
    missing: '',
    problems: '',
    tgKnow: 'Да',
    tgUse: 'Да, иногда',
    improvements: ['Быстрый повтор предыдущего пропуска'],
    csat: [{ question: 'Приложение в целом — насколько вы им довольны', value: 5 }],
    csi: [{ question: 'Быстрота создания пропуска', importance: 5, satisfaction: 5 }]
  });
}
