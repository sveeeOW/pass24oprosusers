import { ADMIN_TOKEN, getFromAppsScript, normalizeBody, readRequestBody } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = normalizeBody(req.body && Object.keys(req.body || {}).length ? req.body : await readRequestBody(req));
    const token = String(body?.token || "").trim();

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // Используем GET до Apps Script, чтобы избежать POST redirect → HTML 405.
    const result = await getFromAppsScript("clearResponses", token);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error("clear-results error", error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script clear error" });
  }
}
