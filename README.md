# i18n Sheet Sync Tool

一個用於同步 Google Sheet 多語系資料與本地 JSON 檔案的工具，並提供一個簡單的 Web 介面進行操作。

## 目錄結構

```
├── bin/ # CLI 執行入口
├── locales/ # 自動產生的各語系 JSON 檔案存放目錄
├── public/ # Web 介面靜態檔案 (index.html)
├── src/ # 核心程式碼
│ ├── sync.ts # 主要的同步與下載邏輯
│ └── types.ts # TypeScript 類型定義
├── googleApi.json # Google Service Account Key 檔案 (請替換為你的憑證檔案)
├── i18n.config.json # 設定檔
├── entire.json # 從 Google Sheet 下載的完整資料暫存檔
├── package.json # pnpm 依賴管理
├── pnpm-lock.yaml # pnpm lock 檔案
├── server.ts # Web 伺服器入口
└── tsconfig.json # TypeScript 編譯設定
```

## 功能特色

- 從 Google Sheet 下載多語系資料到本地 `entire.json`。
- 將本地 `entire.json` 的新增資料同步 (Append) 到 Google Sheet。
- 根據設定的語系列表，自動將 `entire.json` 轉換並生成各語言的 JSON 檔案到 `locales/` 目錄下，格式為 `{"分類.key": "翻譯文字"}`。
- Web 操作介面，提供：
  - 一鍵下載 Google Sheet 資料並生成語系檔案。
  - 瀏覽 Google Sheet 中的所有語系資料。
  - 新增多語系資料 (輸入分類、key、zh-TW，其他語系自動生成 `=GOOGLETRANSLATE()` 公式並同步到 Sheet，然後自動重新下載更新本地)。
  - 刪除 Google Sheet 中的指定資料行 (同步刪除並自動重新下載更新本地)。

## 前置準備

1.  **Node.js 環境:** 確保你的系統安裝了 Node.js (建議 v18 或更高版本)。
2.  **pnpm:** 建議使用 pnpm 作為套件管理器。如果沒有安裝，可以透過 npm 安裝：`npm install -g pnpm`。
3.  **Google Sheets API 憑證:**
    - 在 Google Cloud Platform (GCP) 建立一個專案 (如果還沒有)。
    - 啟用 Google Sheets API。
    - 建立一個 Service Account (服務帳戶)。
    - 生成一個 Service Account Key (JSON 格式)，下載該 JSON 檔案，並將其命名為 `googleApi.json` 放在專案根目錄。
    - 將該服務帳戶的電子郵件地址添加到你的 Google Sheet 的分享列表中，並賦予其 **編輯者 (Editor)** 或更高的權限，以便程式可以讀取、新增和刪除資料。
4.  **Google Sheet 設定:** 準備一個 Google Sheet 試算表，其中包含你的多語系資料。第一列應為標題，包含 `分類`, `key` 以及你設定的各語言代碼 (例如 `zh-TW`, `en-US` 等)。

## 安裝

1.  複製專案到本地：
    ```bash
    git clone <你的專案Git網址>
    cd i18n-sheet-sync
    ```
2.  安裝依賴套件：
    ```bash
    pnpm install
    ```

## 設定

編輯專案根目錄下的 `i18n.config.json` 檔案，填寫你的 Google Sheet 資訊：

```json
{
  "sheetId": "YOUR_SPREADSHEET_ID", // 你的 Google Sheet 試算表網址列上的 ID
  "auth": "./googleApi.json", // 你的 Google Service Account Key 檔案路徑 (已預設為根目錄下的 googleApi.json)
  "langs": ["zh-TW", "en-US", "zh-CN", "zh-HK", "vi-VN"], // 你的多語系列表
  "sheetName": "Translations", // 你的 Google Sheet 中實際存放資料的工作表名稱 (必須完全匹配)
  "baseLang": "zh-TW" // 基礎語言 (用於 GOOGLETRANSLATE 的來源語言)
}
```

- `sheetId`: 這是你的 Google Sheet 試算表網址中的那串長 ID。
- `sheetName`: **請確保這個名稱與你的 Google Sheet 中實際存放語系資料的** **工作表 (Sheet) 名稱** **完全一致 (包含大小寫和空格)。**

## 使用方法

### 1. Web 介面 (推薦)

1.  啟動 Web 伺服器：
    ```bash
    pnpm exec ts-node server.ts
    ```
    伺服器會在 http://localhost:3000 啟動。
2.  打開瀏覽器，訪問 [http://localhost:3000](http://localhost:3000)。
3.  在介面上，你可以：
    - 點擊按鈕下載 Google Sheet 資料並生成本地語系檔案。
    - 瀏覽現有的語系資料表格。
    - 在下方表單輸入「分類」、「key」、「zh-TW」新增資料 (其他語系會自動填寫 Google Translate 公式並同步到 Sheet)。
    - 點擊每行資料最後的「刪除」按鈕，刪除 Google Sheet 中的對應資料。

### 2. CLI (Command Line Interface)

通常用於自動化流程。

- **下載 Google Sheet 資料並生成本地語系檔案:**

  ```bash
  npx ts-node bin/cli.ts --download --config ./i18n.config.json --out ./entire.json --sheet-name Translations
  ```

  (請注意：`--sheet-name` 參數應與 `i18n.config.json` 中的 `sheetName` 一致)

- **同步本地 entire.json 的新增資料到 Google Sheet:**
  ```bash
  npx ts-node bin/cli.ts --json ./entire.json --config ./i18n.config.json --sheet-name Translations
  ```
  (這個指令只會將 `entire.json` 中 Google Sheet 沒有的資料 **追加** 到 Sheet 中)

## 開發

如果你需要修改程式碼：

- 核心同步邏輯在 `src/sync.ts`。
- Web 伺服器邏輯在 `server.ts`。
- Web 介面 HTML 在 `public/index.html`。

修改 `.ts` 檔案後，重新啟動 `pnpm exec ts-node server.ts` 即可看到效果。

## 注意事項

- Google Sheets API 的 `GOOGLETRANSLATE` 公式可能需要一些時間來計算並顯示結果。新增資料後，Sheet 中的翻譯可能不會立即出現。
- 請妥善保管你的 `googleApi.json` 檔案，不要將其暴露在公開的程式碼倉庫中。
- 刪除功能直接操作 Google Sheet，請謹慎使用。

---
