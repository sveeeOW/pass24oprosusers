const ADMIN_TOKEN = "pass24opros24";

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
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = String(req.query?.token || "").trim();
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  let appsScriptUrl;
  try {
    appsScriptUrl = getAppsScriptUrl();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  try {
    const url = new URL(appsScriptUrl);
    url.searchParams.set("action", "getResponses");
    url.searchParams.set("token", token);

    const response = await fetch(url.toString());
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      console.error("Apps Script read error", result);
      return res.status(500).json({ ok: false, error: result.error || "Apps Script read error" });
    }

    return res.status(200).json({ ok: true, data: result.data || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message || "Apps Script read error" });
  }
}
