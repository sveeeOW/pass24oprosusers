const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec";

export const ADMIN_TOKEN = "pass24opros24";

export function getAppsScriptUrl() {
  const envUrl = String(process.env.APPS_SCRIPT_URL || "").trim();

  // Нужен стабильный URL вида https://script.google.com/macros/s/.../exec.
  // Если в Vercel случайно осталась временная redirect-ссылка googleusercontent, игнорируем её.
  if (envUrl && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/i.test(envUrl)) {
    return envUrl;
  }

  return DEFAULT_APPS_SCRIPT_URL;
}

export async function readRequestBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  } catch {
    return {};
  }
}

export function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function makeFormBody(action, payload = {}, token = "") {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const params = new URLSearchParams();

  params.set("action", action);
  if (token) params.set("token", token);

  // Главный формат: всё тело ответа целиком в payload.
  params.set("payload", JSON.stringify(safePayload));

  // Дублируем ключевые поля напрямую для совместимости со старыми версиями Code.gs.
  Object.entries(safePayload).forEach(([key, value]) => {
    params.set(key, stringifyValue(value));
  });

  return params.toString();
}

async function parseAppsScriptResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    const shortText = text.slice(0, 500).replace(/\s+/g, " ").trim();
    const err = new Error(`Apps Script вернул не JSON. HTTP ${response.status}. Ответ: ${shortText || "пусто"}`);
    err.status = response.status;
    err.responseText = shortText;
    throw err;
  }
}

function isWriteAction(action) {
  return ["addResponse", "submitSurvey", "submit", "seedDemo", "addDemo", "demo", "demoData", "debugWrite", "clearResponses", "clear"].includes(action);
}

export async function postToAppsScript(action, payload = {}, token = "") {
  const appsScriptUrl = getAppsScriptUrl();
  const formBody = makeFormBody(action, payload, token);
  const headers = { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" };

  let wasRedirect = false;
  let response = await fetch(appsScriptUrl, {
    method: "POST",
    headers,
    body: formBody,
    redirect: "manual"
  });

  // Apps Script Web App почти всегда отвечает редиректом на googleusercontent.
  // ВАЖНО: для 301/302/303 надо идти на Location через GET, а не повторять POST.
  // Повторный POST на googleusercontent часто даёт HTML 405, хотя запись уже выполнена.
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    wasRedirect = true;
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Apps Script redirect без Location. HTTP ${response.status}`);
    }

    if ([301, 302, 303].includes(response.status)) {
      response = await fetch(location, { method: "GET", redirect: "follow" });
    } else {
      response = await fetch(location, {
        method: "POST",
        headers,
        body: formBody,
        redirect: "follow"
      });
    }
  }

  try {
    const result = await parseAppsScriptResponse(response);
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Apps Script error. HTTP ${response.status}`);
    }
    return result;
  } catch (error) {
    // Если исходный POST уже дошёл до Apps Script, но редирект Google вернул HTML/405,
    // не показываем пользователю ложную ошибку. После этого UI перечитает Google Sheet.
    if (wasRedirect && isWriteAction(action)) {
      console.warn("Apps Script write finished with non-JSON redirect response, treating as success", error.message);
      return { ok: true, warning: error.message, assumedSuccessAfterRedirect: true };
    }
    throw error;
  }
}

export async function getFromAppsScript(action, token = "") {
  const appsScriptUrl = getAppsScriptUrl();
  const url = new URL(appsScriptUrl);
  url.searchParams.set("action", action);
  if (token) url.searchParams.set("token", token);

  const response = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  const result = await parseAppsScriptResponse(response);
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Apps Script error. HTTP ${response.status}`);
  }
  return result;
}
