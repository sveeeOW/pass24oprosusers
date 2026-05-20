import { ADMIN_TOKEN, getFromAppsScript } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = String(req.query?.token || "").trim();
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const result = await getFromAppsScript("getResponses", token);
    return res.status(200).json({ ok: true, data: result.data || [] });
  } catch (error) {
    console.error("get-results error", error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script read error" });
  }
}
