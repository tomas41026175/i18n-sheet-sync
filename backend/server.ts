import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { downloadSheetToJson, syncJsonToSheet } from "./sync.ts";
import config from "../shared/i18n-config.ts";
import fs from "fs/promises";
import type { Request, Response } from "express";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3005;

app.use(express.json());
app.use(cors());

app.post("/download", async (req: Request, res: Response) => {
  try {
    const { sheetName } = req.body;
    await downloadSheetToJson(
      { ...config, sheetName: sheetName || config.sheetName },
      path.join(__dirname, "./entire.json")
    );
    res.json({ success: true, message: "下載並產生語系檔案完成" });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  }
});

app.get("/data", async (_: Request, res: Response) => {
  try {
    const raw = await fs.readFile(
      path.join(__dirname, "./entire.json"),
      "utf-8"
    );
    const data = JSON.parse(raw);

    if (data.length === 0) {
      res.status(550).json({ success: false, message: "資料為空" });
      return;
    }

    res.json({ success: true, data });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  }
});

app.post("/add", async (req: Request, res: Response) => {
  try {
    // 從 config 中獲取支援的語系列表
    const supportedLangs = config.langs;

    // 檢查 cate 和 key 是否存在
    const { cate, key } = req.body;
    if (!cate || !key) {
      res.json({ success: false, message: "缺少必要欄位 (cate 或 key)" });
      return;
    }

    // 構建新資料物件，動態從 req.body 中獲取語系對應的值
    const newRowData: Record<string, string> = {
      cate: cate,
      key: key,
    };

    let baseLangValue = ""; // 用於檢查 baseLang 是否有值

    supportedLangs.forEach((lang) => {
      // 將語系代碼中的 '-' 移除，生成對應的鍵名
      const langKey = lang.replace("-", "");
      const value = req.body[langKey] || ""; // 從 body 中獲取對應語系的值

      // 如果是 baseLang，檢查是否有值
      if (lang === config.baseLang) {
        baseLangValue = value;
      }

      newRowData[lang] = value; // 將資料存儲到 newRowData 中，鍵名使用帶 '-' 的完整語系代碼
    });

    // 檢查 baseLang 是否有值
    if (!baseLangValue) {
      res.json({
        success: false,
        message: `基礎語系 (${config.baseLang}) 的值不能為空`,
      });
      return;
    }

    // 讀取 entire.json 檢查是否重複 (使用 cate 和 key 組合檢查)
    const entireJsonPath = path.join(__dirname, "./entire.json");
    const raw = await fs.readFile(entireJsonPath, "utf-8");
    const arr: Array<Record<string, string>> = JSON.parse(raw);

    if (arr.some((row) => row.cate === cate && row.key === key)) {
      res.json({
        success: false,
        message: `分類 "${cate}" + key "${key}" 已存在`,
      });
      return;
    }

    // 將新資料添加到現有資料陣列中
    arr.push(newRowData);

    // 將更新後的資料寫回 entire.json 檔案
    await fs.writeFile(entireJsonPath, JSON.stringify(arr, null, 2), "utf-8");

    // 同步到 Google Sheet
    await syncJsonToSheet(entireJsonPath, config);

    // 下載最新資料 (確保本地 entire.json 與 Sheet 同步)
    await downloadSheetToJson(config, entireJsonPath);

    res.json({
      success: true,
      message: "已新增資料，同步寫入 Google Sheet 並下載最新資料完成",
    });
  } catch (e: any) {
    console.error("新增資料時發生錯誤:", e);
    res.json({ success: false, message: `新增資料時發生錯誤: ${e.message}` });
  }
});

app.post("/resetLocal", async (req: Request, res: Response) => {
  try {
    // 清空 entire.json 檔案
    await fs.writeFile(
      path.join(__dirname, "./entire.json"),
      JSON.stringify([], null, 2),
      "utf-8"
    );

    res.json({
      success: true,
      message: "已重置所有資料",
    });
  } catch (e: any) {
    console.error("資料失敗:", e);
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
      keyFile: path.join(__dirname, config.auth),
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
    await downloadSheetToJson(config, path.join(__dirname, "./entire.json"));

    res.json({
      success: true,
      message: "資料已從 Google Sheet 刪除並更新本地畫面",
    });
  } catch (e: any) {
    console.error("刪除 Google Sheet 資料失敗:", e);
    // 捕獲具體的 API 錯誤訊息並回傳，包括 API 錯誤的詳細信息
    if (e.response && e.response.data && e.response.data.error) {
      const apiError = e.response.data.error;
      console.error("Google API 錯誤詳細信息:", apiError);
      res.json({
        success: false,
        message: `刪除 Google Sheet 資料失敗: ${apiError.message || e.message}`,
      });
    } else if (e.code === 400 && e.errors && e.errors[0].message) {
      res.json({
        success: false,
        message: "刪除 Google Sheet 資料失敗: " + e.errors[0].message,
      });
    } else {
      res.json({
        success: false,
        message: "刪除 Google Sheet 資料失敗: " + e.message,
      });
    }
  }
});

app.listen(port, () => {
  console.log(`已啟動：http://localhost:${port}`);
});
