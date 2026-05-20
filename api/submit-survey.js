const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfCubdL0GqzT7Xc93Vb8wkbNZl36PAEQJonE2V_N_5O2Hx-tw9uzVyOiJvX9SLlk0Z/exec";

function getAppsScriptUrl() {
  const envUrl = String(process.env.APPS_SCRIPT_URL || "").trim();

  // Если в Vercel осталась старая/битая переменная script.googleusercontent.com,
  // не даём ей ломать проект и используем зафиксированный рабочий Web App URL.
  if (envUrl && envUrl.includes("script.googleusercontent.com/macros/echo")) {
    return DEFAULT_APPS_SCRIPT_URL;
  }

  return envUrl || DEFAULT_APPS_SCRIPT_URL;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let appsScriptUrl;
  try {
    appsScriptUrl = getAppsScriptUrl();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  try {
    const body = req.body || {};

    if (!body.name || !body.objectName || body.nps === null || body.nps === undefined) {
      return res.status(400).json({ ok: false, error: "Required fields are missing" });
    }

    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "addResponse", payload: body })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      console.error("Apps Script write error", result);
      return res.status(500).json({ ok: false, error: result.error || "Apps Script write error" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script write error" });
  }
}
