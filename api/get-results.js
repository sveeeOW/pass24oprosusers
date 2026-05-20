import {
  ensureSheetAndHeaders,
  getSheetsClient,
  isAuthorized,
  quoteSheetName,
  rowToResponse
} from "../lib/googleSheets.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = req.query?.token;
  if (!isAuthorized(token)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const { sheets, spreadsheetId, sheetName } = getSheetsClient();
    await ensureSheetAndHeaders(sheets, spreadsheetId, sheetName);

    const range = `${quoteSheetName(sheetName)}!A2:R`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];
    const data = rows
      .filter(row => row.some(cell => String(cell || "").trim() !== ""))
      .map(rowToResponse)
      .reverse();

    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Google Sheets read error" });
  }
}
