import { google } from "googleapis";

export const HEADERS = [
  "created_at",
  "name",
  "object_name",
  "object_type",
  "role",
  "nps",
  "nps_reason",
  "missing",
  "problems",
  "tg_know",
  "tg_use",
  "improvements_json",
  "csat_json",
  "csi_json",
  "csat_avg",
  "csi_importance_avg",
  "csi_satisfaction_avg",
  "raw_json"
];

export function getEnv() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_TAB || "Ответы";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const adminToken = process.env.ADMIN_TOKEN;

  const missing = [];
  if (!spreadsheetId) missing.push("GOOGLE_SHEET_ID");
  if (!clientEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!privateKey) missing.push("GOOGLE_PRIVATE_KEY");
  if (!adminToken) missing.push("ADMIN_TOKEN");

  return { spreadsheetId, sheetName, clientEmail, privateKey, adminToken, missing };
}

export function getSheetsClient() {
  const env = getEnv();
  if (env.missing.length) {
    throw new Error(`Missing env variables: ${env.missing.join(", ")}`);
  }

  const auth = new google.auth.JWT({
    email: env.clientEmail,
    key: env.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: env.spreadsheetId,
    sheetName: env.sheetName,
    adminToken: env.adminToken
  };
}

export function quoteSheetName(sheetName) {
  return `'${String(sheetName).replaceAll("'", "''")}'`;
}

export async function ensureSheetAndHeaders(sheets, spreadsheetId, sheetName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }]
      }
    });
  }

  const range = `${quoteSheetName(sheetName)}!A1:R1`;
  const current = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = current.data.values || [];
  const firstRow = values[0] || [];

  const hasCorrectHeaders = HEADERS.every((h, i) => firstRow[i] === h);
  if (!hasCorrectHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] }
    });
  }
}

export function avg(values) {
  const clean = values.map(Number).filter(v => !Number.isNaN(v));
  if (!clean.length) return "";
  return Number((clean.reduce((a, b) => a + b, 0) / clean.length).toFixed(2));
}

export function jsonString(value) {
  return JSON.stringify(value ?? null);
}

export function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function responseToRow(body) {
  const csat = Array.isArray(body.csat) ? body.csat : [];
  const csi = Array.isArray(body.csi) ? body.csi : [];
  const improvements = Array.isArray(body.improvements) ? body.improvements : [];

  return [
    new Date().toISOString(),
    body.name || "",
    body.objectName || "",
    body.objectType || "",
    body.role || "",
    body.nps ?? "",
    body.npsReason || "",
    body.missing || "",
    body.problems || "",
    body.tgKnow || "",
    body.tgUse || "",
    jsonString(improvements),
    jsonString(csat),
    jsonString(csi),
    avg(csat.map(x => x?.value)),
    avg(csi.map(x => x?.importance)),
    avg(csi.map(x => x?.satisfaction)),
    jsonString(body)
  ];
}

export function rowToResponse(row) {
  const values = {};
  HEADERS.forEach((header, index) => {
    values[header] = row[index] ?? "";
  });

  const improvements = parseJson(values.improvements_json, []);
  const csat = parseJson(values.csat_json, []);
  const csi = parseJson(values.csi_json, []);

  return {
    date: values.created_at ? new Date(values.created_at).toLocaleString("ru-RU") : "",
    name: values.name || "",
    objectName: values.object_name || "",
    objectType: values.object_type || "",
    role: values.role || "",
    nps: values.nps === "" ? null : Number(values.nps),
    npsReason: values.nps_reason || "",
    missing: values.missing || "",
    problems: values.problems || "",
    tgKnow: values.tg_know || "",
    tgUse: values.tg_use || "",
    improvements: Array.isArray(improvements) ? improvements : [],
    csat: Array.isArray(csat) ? csat : [],
    csi: Array.isArray(csi) ? csi : []
  };
}

export function isAuthorized(token) {
  const env = getEnv();
  return Boolean(token && env.adminToken && token === env.adminToken);
}
