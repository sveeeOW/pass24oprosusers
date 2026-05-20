import {
  ensureSheetAndHeaders,
  getSheetsClient,
  isAuthorized,
  quoteSheetName
} from "../lib/googleSheets.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = req.body?.token;
  if (!isAuthorized(token)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const { sheets, spreadsheetId, sheetName } = getSheetsClient();
    await ensureSheetAndHeaders(sheets, spreadsheetId, sheetName);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A2:R`
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Google Sheets clear error" });
  }
}
