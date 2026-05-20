import {
  ensureSheetAndHeaders,
  getSheetsClient,
  quoteSheetName,
  responseToRow
} from "../lib/googleSheets.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    if (!body.name || !body.objectName || body.nps === null || body.nps === undefined) {
      return res.status(400).json({ ok: false, error: "Required fields are missing" });
    }

    const { sheets, spreadsheetId, sheetName } = getSheetsClient();
    await ensureSheetAndHeaders(sheets, spreadsheetId, sheetName);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A:R`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [responseToRow(body)] }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Google Sheets write error" });
  }
}
