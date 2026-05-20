const DEFAULT_APPS_SCRIPT_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQyLLfbuF_FETAgqCjZCekC1Sg0GO9og_v32is70bj61TJlZDjHRaHENnPW-VoyrJe8RKI3gN1MYoNAej58RDH_QywIcGuHqrzqmSiYUToNyhymKMjQNgdV3Gv2FoBdF0KFVGJ3VO8HD-Jc3NbdpkIAlTN4bLUwyMIDPvOwhS4FFj5gqH5PO_-_AU4TusoHu4DEAo2D2xz7Ll5Hsol9IvkeRi5kTOTsOChJH5ppe3xuKw3Ye8sjhFRWStcSDeL-wAagO9tkNnZcd4VHtB-5ZhcYyfaWuQ&lib=MoK-R-c2tF-A5VYYTn99JYUpRjWXLvCQ_";
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
const ADMIN_TOKEN = "pass24opros24";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = String(req.body?.token || "").trim();
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ ok: false, error: "Missing APPS_SCRIPT_URL" });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "clearResponses", token })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      console.error("Apps Script clear error", result);
      return res.status(500).json({ ok: false, error: result.error || "Apps Script clear error" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Apps Script clear error" });
  }
}
