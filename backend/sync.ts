import { google } from "googleapis";
import fs from "fs/promises";
import { JWT } from "google-auth-library";
import type { SheetConfig } from "../shared/types.ts";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import type { sheets_v4 } from "googleapis"; // 導入 Google Sheets API 的型別

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function syncJsonToSheet(jsonPath: string, config: SheetConfig) {
  const { sheetId, auth, langs, sheetName = "Translations" } = config;

  const authClient = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    keyFile: path.join(__dirname, auth),
  });
  const client = (await authClient.getClient()) as JWT;
  const sheets = google.sheets({ version: "v4", auth: client });

  // 1. 從 Google Sheet 獲取所有資料
  const sheetResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`, // 讀取所有可能的欄位
  });
  const sheetValues = sheetResponse.data.values || [];
  const sheetHeader = sheetValues.length > 0 ? sheetValues[0] : [];
  const sheetData = sheetValues.slice(1);

  // 建立 Sheet 數據的 cate+key 映射
  const sheetDataMap = new Map<string, string[]>();
  const sheetKeyIndex = sheetHeader.indexOf("ResourceKey");
  const sheetCateIndex = sheetHeader.indexOf("ResourceType");

  if (sheetKeyIndex === -1 || sheetCateIndex === -1) {
    console.error(
      "⚠️ Google Sheet 標題不包含 'ResourceKey' 或 'ResourceType'。"
    );
    // 根據需要處理錯誤，例如拋出異常或終止同步
    // return;
  }

  sheetData.forEach((row) => {
    if (sheetCateIndex !== -1 && sheetKeyIndex !== -1) {
      const key = `${row[sheetCateIndex]}|${row[sheetKeyIndex]}`;
      sheetDataMap.set(key, row);
    }
  });

  // 2. 從本地 entire.json 讀取所有資料
  const rawJson = await fs.readFile(jsonPath, "utf-8");
  const jsonArr: Array<Record<string, string>> = JSON.parse(rawJson);

  // 建立 JSON 數據的 cate+key 映射
  const jsonDataMap = new Map<string, Record<string, string>>();
  jsonArr.forEach((row) => {
    const key = `${row.cate}|${row.key}`;
    jsonDataMap.set(key, row);
  });

  // 3. 比對差異並準備新增/修改/刪除請求
  const requests = [];
  const keysInSheet = new Set(sheetDataMap.keys());
  const keysInJson = new Set(jsonDataMap.keys());

  // 找出需要新增和修改的項目
  for (const jsonKey of keysInJson) {
    const jsonRow = jsonDataMap.get(jsonKey)!;
    const sheetRow = sheetDataMap.get(jsonKey);

    if (!sheetRow) {
      // 新增：在 Sheet 中不存在的項目
      const newRowValues = [
        jsonRow.cate,
        jsonRow.key,
        ...langs.map((lang) => jsonRow[lang] || ""),
      ];

      const rowData: sheets_v4.Schema$RowData = {
        // 使用 API 定義的 RowData 型別
        values: newRowValues.map((value) => ({
          userEnteredValue: { stringValue: String(value) }, // 將 rawValue 改為 stringValue
        })),
      };

      requests.push({
        appendCells: {
          sheetId: undefined, // 暫時設為 undefined，後面會賦值
          rows: [rowData],
          fields: "userEnteredValue",
        } as sheets_v4.Schema$Request, // 明確斷言型別
      });
      console.log(`➕ 新增: ${jsonKey}`);
    } else {
      // 修改：在 Sheet 中存在但內容不同的項目
      let needsUpdate = false;
      const updatedRowValues = [jsonRow.cate, jsonRow.key];
      const sheetRowValues = [
        sheetRow[sheetCateIndex],
        sheetRow[sheetKeyIndex],
      ];

      langs.forEach((lang) => {
        const jsonValue = jsonRow[lang] || "";
        const sheetValue = sheetRow[sheetHeader.indexOf(lang)] || "";
        updatedRowValues.push(jsonValue);
        if (jsonValue !== sheetValue) {
          needsUpdate = true;
        }
        // 為了比對，SheetRowValues 也應該包含所有語言的值
        sheetRowValues.push(sheetValue);
      });

      // 這裡需要更精確的比對邏輯，檢查每個語言欄位是否一致
      // 由於上面已經比對了 langs，如果 needsUpdate 為 true 說明內容不同

      // 找到 Sheet 中對應行的索引（1-based）
      let rowIndexInSheet = -1;
      // 使用 findIndex 更簡潔且正確
      const dataIndex = sheetData.findIndex((row) => {
        if (sheetCateIndex !== -1 && sheetKeyIndex !== -1) {
          const currentSheetKey = `${row[sheetCateIndex]}|${row[sheetKeyIndex]}`;
          return currentSheetKey === jsonKey;
        }
        return false;
      });

      if (dataIndex === -1) {
        console.error(`⚠️ 無法在 Sheet 中找到對應 ${jsonKey} 的行進行更新。`);
        continue; // 跳過此行
      }
      rowIndexInSheet = dataIndex + 2; // +2 轉換為 1-based 索引，跳過標題行

      if (needsUpdate) {
        const rowData: sheets_v4.Schema$RowData = {
          // 使用 API 定義的 RowData 型別
          values: updatedRowValues.map((value) => ({
            userEnteredValue: { stringValue: String(value) }, // 將 rawValue 改為 stringValue
          })),
        };

        requests.push({
          updateCells: {
            sheetId: undefined, // 暫時設為 undefined
            rows: [rowData],
            start: { rowIndex: rowIndexInSheet - 1, columnIndex: 0 }, // -1 轉換為 0-based 索引
            fields: "userEnteredValue",
          } as sheets_v4.Schema$Request, // 明確斷言型別
        });
        console.log(`✏️ 修改: ${jsonKey} (Sheet Row: ${rowIndexInSheet})`);
      }
    }
  }

  // 找出需要刪除的項目 (在 Sheet 中存在但在 JSON 中不存在)
  const keysToDelete = Array.from(keysInSheet).filter(
    (sheetKey) => !keysInJson.has(sheetKey)
  );

  // 需要獲取需要刪除的行的實際 Sheet 索引 (1-based)
  const rowsToDeleteIndices: number[] = [];
  sheetData.forEach((row, index) => {
    if (sheetCateIndex !== -1 && sheetKeyIndex !== -1) {
      const sheetKey = `${row[sheetCateIndex]}|${row[sheetKeyIndex]}`;
      if (keysToDelete.includes(sheetKey)) {
        rowsToDeleteIndices.push(index + 2); // +2 轉換為 1-based 索引，並跳過標題行
      }
    }
  });

  // 從大到小排序刪除索引，確保刪除時索引不會錯亂
  rowsToDeleteIndices.sort((a, b) => b - a);

  rowsToDeleteIndices.forEach((rowIndex) => {
    requests.push({
      deleteDimension: {
        range: {
          sheetId: undefined, // 暫時設為 undefined
          dimension: "ROWS",
          startIndex: rowIndex - 1, // -1 轉換為 0-based 索引
          endIndex: rowIndex, // exclusive
        },
      } as sheets_v4.Schema$DeleteDimensionRequest, // 明確斷言型別
    } as sheets_v4.Schema$Request); // 明確斷言型別
    console.log(`🗑️ 刪除索引: ${rowIndex}`);
  });

  // 4. 執行批量更新
  if (requests.length > 0) {
    // 需要獲取正確的 Sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const targetSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    );

    if (!targetSheet || targetSheet.properties?.sheetId == null) {
      console.error(`⚠️ 找不到名稱為 "${sheetName}" 的工作表或其 ID。`);
      return;
    }

    const targetSheetId = targetSheet.properties.sheetId;

    // 更新請求中的 Sheet ID
    requests.forEach((request) => {
      // 這裡需要根據請求類型來安全地賦值 sheetId
      if ("appendCells" in request) {
        (
          request as { appendCells: sheets_v4.Schema$AppendCellsRequest }
        ).appendCells.sheetId = targetSheetId;
      } else if ("updateCells" in request) {
        (
          request as { updateCells: sheets_v4.Schema$UpdateCellsRequest }
        ).updateCells.range = {
          sheetId: targetSheetId,
          startRowIndex: (request as any).updateCells.start.rowIndex,
          endRowIndex: (request as any).updateCells.start.rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: (request as any).updateCells.rows[0].values.length,
        };
      } else if ("deleteDimension" in request) {
        (
          request as {
            deleteDimension: sheets_v4.Schema$DeleteDimensionRequest;
          }
        ).deleteDimension!.range!.sheetId = targetSheetId;
      }
    });

    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: requests as sheets_v4.Schema$Request[] }, // 再次明確斷言型別
      });
      console.log(`✅ 已執行批量更新，包含 ${requests.length} 個請求。`);
    } catch (error: any) {
      console.error("❌ 批量更新失敗:", error.message, error.response?.data);
      throw error; // 重新拋出錯誤以便調用者處理
    }
  } else {
    console.log("ℹ️ Sheet 與本地數據已同步，無需更新。");
  }
}

export async function downloadSheetToJson(
  config: SheetConfig,
  outPath: string
) {
  const { sheetId, auth, langs, sheetName = "Translations" } = config;

  const authClient = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    keyFile: path.join(__dirname, auth),
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
  const cateIdx = header.indexOf("ResourceType");
  const keyIdx = header.indexOf("ResourceKey");
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
