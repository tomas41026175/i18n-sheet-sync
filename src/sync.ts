import { google } from "googleapis";
import fs from "fs/promises";
import { JWT } from "google-auth-library";
import { SheetConfig } from "./types";

export async function syncJsonToSheet(jsonPath: string, config: SheetConfig) {
  const { sheetId, auth, langs, sheetName = "Translations", baseLang } = config;

  const raw = await fs.readFile(jsonPath, "utf-8");
  const jsonArr: Array<Record<string, string>> = JSON.parse(raw);

  const authClient = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    keyFile: auth,
  });
  const client = (await authClient.getClient()) as JWT;
  const sheets = google.sheets({ version: "v4", auth: client });

  const sheetData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z`,
  });

  const existing = sheetData.data.values || [];
  const existingKeys = new Set(
    existing.slice(1).map((row) => `${row[0]}|${row[1]}`)
  );
  const newRows: string[][] = [];

  for (const row of jsonArr) {
    const cate = row.cate || "";
    const key = row.key || "";
    if (!key) continue;
    if (existingKeys.has(`${cate}|${key}`)) continue;
    const langValues = langs.map((lang) => row[lang] || "");
    newRows.push([cate, key, ...langValues]);
  }

  if (newRows.length === 0) {
    console.log("⚠️ No new keys to insert.");
    return;
  }

  if (existing.length === 0) {
    const header = ["分類", "key", ...langs];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [header] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: newRows },
  });

  console.log(`✅ Appended ${newRows.length} keys to Google Sheet.`);
}

export async function downloadSheetToJson(
  config: SheetConfig,
  outPath: string
) {
  const { sheetId, auth, langs, sheetName = "Translations" } = config;

  const authClient = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    keyFile: auth,
  });
  const client = (await authClient.getClient()) as JWT;
  const sheets = google.sheets({ version: "v4", auth: client });

  const sheetData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z`,
  });

  const values = sheetData.data.values || [];
  if (values.length < 2) {
    console.log("⚠️ Google Sheet 沒有資料");
    return;
  }

  const header = values[0];
  const cateIdx = header.indexOf("分類");
  const keyIdx = header.indexOf("Key");
  const langIdxs: Record<string, number> = {};
  langs.forEach((lang) => {
    langIdxs[lang] = header.indexOf(lang);
  });

  const result: Array<Record<string, string>> = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj: Record<string, string> = {
      cate: row[cateIdx] || "",
      key: row[keyIdx] || "",
    };
    langs.forEach((lang) => {
      const idx = langIdxs[lang];
      obj[lang] = idx !== -1 ? row[idx] || "" : "";
    });
    if (obj.key) result.push(obj);
  }
  await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`✅ 已下載 Google Sheet 多語資料到 ${outPath}`);

  // 依語言自動產生各語言 json 檔案，存放到 locales 資料夾
  const localesDir = "locales";
  try {
    await fs.mkdir(localesDir, { recursive: true });
  } catch (e) {}
  for (const lang of langs) {
    const langObj: Record<string, string> = {};
    for (const row of result) {
      if (!row.cate || !row.key) continue;
      langObj[`${row.cate}.${row.key}`] = row[lang] || "";
    }
    await fs.writeFile(
      `${localesDir}/${lang}.json`,
      JSON.stringify(langObj, null, 2),
      "utf-8"
    );
    console.log(`✅ 已產生 ${localesDir}/${lang}.json`);
  }
}
