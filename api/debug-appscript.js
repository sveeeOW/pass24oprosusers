import { getFromAppsScript, postToAppsScript } from "../lib/appsScriptClient.js";

export default async function handler(req, res) {
  try {
    const ping = await getFromAppsScript("ping");
    let postTest = null;
    if (req.query?.write === "1") {
      postTest = await postToAppsScript("addResponse", {
        name: "DEBUG",
        objectName: "DEBUG",
        objectType: "DEBUG",
        role: "DEBUG",
        nps: 10,
        npsReason: "Debug write test",
        missing: "",
        problems: "",
        tgKnow: "Нет",
        tgUse: "",
        improvements: [],
        csat: [],
        csi: []
      });
    }
    return res.status(200).json({ ok: true, ping, postTest });
  } catch (error) {
    console.error("debug-appscript error", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
