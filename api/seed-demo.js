import { ADMIN_TOKEN, getFromAppsScript } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const token = String((req.body && req.body.token) || "").trim();
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // Используем GET до Apps Script, чтобы избежать POST redirect → HTML 405.
    const result = await getFromAppsScript("seedDemo", ADMIN_TOKEN);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error("seed-demo error", error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script seed demo error" });
  }
}
