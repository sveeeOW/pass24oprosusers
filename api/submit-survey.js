import { normalizeBody, postToAppsScript, readRequestBody } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = normalizeBody(req.body && Object.keys(req.body || {}).length ? req.body : await readRequestBody(req));

    if (!body.name || !body.objectName || body.nps === null || body.nps === undefined || body.nps === "") {
      return res.status(400).json({
        ok: false,
        error: "Не заполнены обязательные поля: имя, объект или NPS",
        receivedKeys: Object.keys(body || {})
      });
    }

    await postToAppsScript("addResponse", body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("submit-survey error", error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script write error" });
  }
}
