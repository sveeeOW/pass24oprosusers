/**
 * PASS24.online — Опрос пользователей
 * Google Apps Script Web App для сохранения и чтения ответов из Google Sheets.
 * Script ID: 1M9_d6LGViAgBquXEwNhWkpo1jqiDhWAdJ1dIodIQHNhscoxU0wS7SSA4
 * Web App URL: https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec
 *
 * Как использовать:
 * 1. Открой Google Sheet → Extensions / Расширения → Apps Script.
 * 2. Вставь этот код в Code.gs.
 * 3. Сохрани.
 * 4. Deploy → New deployment → Web app.
 * 5. Execute as: Me.
 * 6. Who has access: Anyone / Anyone with the link.
 * 7. Скопируй Web App URL и добавь в Vercel как APPS_SCRIPT_URL.
 */

const SHEET_NAME = 'Ответы';
const ADMIN_TOKEN = 'pass24opros24';

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
      return jsonResponse({ ok: true, message: 'PASS24 users survey Apps Script is working' });
    }

    if (action === 'getResponses') {
      const token = e.parameter.token || '';
      if (token !== ADMIN_TOKEN) {
        return jsonResponse({ ok: false, error: 'Unauthorized' });
      }
      return jsonResponse({ ok: true, data: getResponses() });
    }

    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const action = body.action || 'addResponse';

    if (action === 'addResponse') {
      const payload = body.payload || body;
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

    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const ok = HEADERS.every((header, index) => current[index] === header);

  if (!ok) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function appendResponse(payload) {
  if (!payload || !payload.name || !payload.objectName || payload.nps === null || payload.nps === undefined) {
    throw new Error('Required fields are missing');
  }

  const sheet = getSheet();
  sheet.appendRow(responseToRow(payload));
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

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value) || fallback;
  } catch (e) {
    return fallback;
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Тестовая функция: можно запустить вручную в Apps Script, чтобы проверить запись в таблицу.
 */
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
