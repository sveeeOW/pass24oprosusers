import { ADMIN_TOKEN, getFromAppsScript } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  try {
    const ping = await getFromAppsScript("ping");
    let postTest = null;
    if (req.query?.write === "1") {
      // Используем GET до Apps Script, чтобы избежать POST redirect → HTML 405.
      postTest = await getFromAppsScript("debugWrite", ADMIN_TOKEN);
    }
    return res.status(200).json({ ok: true, ping, postTest });
  } catch (error) {
    console.error("debug-appscript error", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
