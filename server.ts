import express from "express";
import path from "path";
import { downloadSheetToJson, syncJsonToSheet } from "./src/sync";
import config from "./i18n.config.json";
import fs from "fs/promises";
import type { Request, Response } from "express";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/download", async (req, res) => {
  try {
    const { sheetName } = req.body;
    await downloadSheetToJson(
      { ...config, sheetName: sheetName || config.sheetName },
      "./entire.json"
    );
    res.json({ success: true, message: "下載並產生語系檔案完成" });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.get("/data", async (req, res) => {
  try {
    const raw = await fs.readFile("./entire.json", "utf-8");
    res.json({ success: true, data: JSON.parse(raw) });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post("/add", async (req: Request, res: Response) => {
  try {
    const { cate, key, zhTW } = req.body;
    if (!cate || !key || !zhTW) {
      res.json({ success: false, message: "缺少必要欄位" });
      return;
    }
    // 讀取 entire.json 檢查是否重複
    const raw = await fs.readFile("./entire.json", "utf-8");
    const arr = JSON.parse(raw);
    if (arr.some((row: any) => row.cate === cate && row.key === key)) {
      res.json({ success: false, message: "分類+key 已存在" });
      return;
    }
    // 計算 rowIndex（1-based，含標題）
    const rowIndex = arr.length + 2;
    // 新增到暫存檔，其他語系自動填 GOOGLETRANSLATE 公式
    arr.push({
      cate,
      key,
      "zh-TW": zhTW,
      "en-US": `=GOOGLETRANSLATE(C${rowIndex}, "zh-TW", "en")`,
      "zh-CN": `=GOOGLETRANSLATE(C${rowIndex}, "zh-TW", "zh-CN")`,
      "zh-HK": `=GOOGLETRANSLATE(C${rowIndex}, "zh-TW", "zh-TW")`,
      "vi-VN": `=GOOGLETRANSLATE(C${rowIndex}, "zh-TW", "vi")`,
    });
    await fs.writeFile("./entire.json", JSON.stringify(arr, null, 2), "utf-8");
    // 同步到 Google Sheet
    await syncJsonToSheet("./entire.json", config);
    // 下載最新資料
    await downloadSheetToJson(config, "./entire.json");
    res.json({
      success: true,
      message: "已同步寫入 Google Sheet 並下載最新資料",
    });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  }
});

app.post("/delete", async (req: Request, res: Response) => {
  try {
    const { cate, key } = req.body;
    if (!cate || !key) {
      res.json({ success: false, message: "缺少必要欄位" });
      return;
    }

    console.log("config", config);

    // 初始化 Google Sheets API 客戶端
    const authClient = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"], // 需要寫入權限來刪除
      keyFile: config.auth,
    });
    const client = (await authClient.getClient()) as JWT;
    const sheets = google.sheets({ version: "v4", auth: client });

    // **新增：獲取試算表 metadata，找到正確的 Sheet ID**
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.sheetId,
    });

    const targetSheet = spreadsheet.data.sheets?.find(
      (sheet) =>
        sheet.properties?.title === (config.sheetName || "Translations")
    );

    console.log("targetSheet", targetSheet);

    // 檢查是否找到工作表以及其 sheetId 是否有效 (允許 sheetId 為 0)
    if (!targetSheet || targetSheet.properties?.sheetId == null) {
      // 使用 == null 檢查 null 和 undefined
      // **新增：印出所有工作表名稱，方便除錯**
      const sheetTitles =
        spreadsheet.data.sheets
          ?.map((sheet) => sheet.properties?.title)
          .filter((title) => title !== undefined) || [];
      console.error(
        `找不到名稱為 "${config.sheetName || "Translations"}" 的工作表或其 ID。`
      );
      console.error(`試算表中現有的工作表名稱: ${sheetTitles.join(", ")}`);
      res.json({
        success: false,
        message: `找不到名稱為 "${
          config.sheetName || "Translations"
        }" 的工作表或其 ID。請檢查名稱或大小寫是否完全相符。`,
      });
      return;
    }

    const targetSheetId = targetSheet.properties.sheetId; // 獲取正確的數字 Sheet ID

    // 1. 從 Google Sheet 讀取最新資料，找出要刪除的列索引
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: `${config.sheetName || "Translations"}!A1:Z`,
    });

    const values = sheetData.data.values || [];
    if (values.length < 2) {
      res.json({ success: false, message: "Google Sheet 沒有資料" });
      return;
    }

    const header = values[0];
    // 同時支援 key/Key 的邏輯保留
    const keyIdx =
      header.indexOf("key") !== -1
        ? header.indexOf("key")
        : header.indexOf("Key");
    const cateIdx = header.indexOf("分類"); // 分類的索引

    let rowIndexToDelete = -1; // 0-based index in the array (for values array)
    // 注意：在 Google Sheet API 中，行索引是 1-based，且包含標題行
    // 所以實際要刪除的 Google Sheet 行索引 = rowIndexToDelete + 1

    for (let i = 1; i < values.length; i++) {
      // 從索引 1 開始遍歷，跳過標題行
      const row = values[i];
      const rowCate = row[cateIdx] || "";
      const rowKey = row[keyIdx] || "";
      if (rowCate === cate && rowKey === key) {
        rowIndexToDelete = i; // 找到符合的行在 values array 中的索引 (0-based)
        break;
      }
    }

    if (rowIndexToDelete === -1) {
      res.json({
        success: false,
        message: "在 Google Sheet 資料中找不到符合的資料",
      });
      return;
    }

    // 3. 構造 DeleteDimensionRequest
    const deleteRequest = {
      deleteDimension: {
        range: {
          sheetId: targetSheetId, // 使用獲取到的正確 Sheet ID
          dimension: "ROWS",
          startIndex: rowIndexToDelete + 1, // 要刪除的 Google Sheet 行索引 (1-based)
          endIndex: rowIndexToDelete + 2, // 結束索引 (exclusive, 1-based)
        },
      },
    };

    // 4. 執行 batchUpdate 刪除 Google Sheet 中的行
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.sheetId,
      requestBody: { requests: [deleteRequest] },
    });

    console.log(`✅ 已從 Google Sheet 刪除分類: ${cate}, key: ${key}`);

    // 5. 下載最新的 Google Sheet 資料來更新本地檔案
    await downloadSheetToJson(config, "./entire.json");

    res.json({ success: true, message: "資料已從 Google Sheet 刪除並更新本地畫面" });

  } catch (e: any) {
    console.error("刪除 Google Sheet 資料失敗:", e);
    // 捕獲具體的 API 錯誤訊息並回傳，包括 API 錯誤的詳細信息
    if (e.response && e.response.data && e.response.data.error) {
       const apiError = e.response.data.error;
       console.error("Google API 錯誤詳細信息:", apiError);
       res.json({ success: false, message: `刪除 Google Sheet 資料失敗: ${apiError.message || e.message}` });
    } else if (e.code === 400 && e.errors && e.errors[0].message) {
       res.json({ success: false, message: "刪除 Google Sheet 資料失敗: " + e.errors[0].message });
    } else {
       res.json({ success: false, message: "刪除 Google Sheet 資料失敗: " + e.message });
    }
  }
});

app.listen(port, () => {
  console.log(`Web 介面已啟動：http://localhost:${port}`);
});
