# i18n Sheet Sync Tool

一個用於同步 Google Sheet 多語系資料與本地 JSON 檔案的工具，並提供一個簡單的 Web 介面進行操作。

## 目錄結構

- `backend/`：後端程式碼
  - `server.ts`：Web 伺服器入口
  - `sync.ts`：主要的同步與下載邏輯
- `frontend/`：前端程式碼 (使用 Vite + React)
  - `index.html`：網頁入口 HTML
  - `src/`：前端原始碼
    - `main.tsx`：React 應用程式入口
    - `components/`：React 元件
      - `SheetSyncApp.tsx`：主要應用程式介面元件
      - `ui/`： shadcn/ui 元件 (例如 `input.tsx`, `table.tsx` 等)
      - 其他前端元件檔案
    - `hooks/`：Custom React Hooks (例如 `useSheetData.ts`)
    - `assets/`：靜態資源
    - `index.css`：主要的 CSS 檔案 (包含 Tailwind CSS 指令)
- `shared/`：後端與前端共用的程式碼
  - `i18n-config.ts`：設定檔 (原 `i18n.config.json`)
  - `types.ts`：TypeScript 類型定義
- `bin/`：CLI 執行入口 (如果有的話，請自行調整)
- `locales/`：自動產生的各語系 JSON 檔案存放目錄
- `entire.json`：從 Google Sheet 下載的完整資料暫存檔
- `googleApi.json`：Google Service Account Key 檔案 (請替換為你的憑證檔案)
- `package.json`：pnpm 依賴管理
- `pnpm-lock.yaml`：pnpm lock 檔案
- `tsconfig.json`：TypeScript 編譯設定 (包含路徑別名)
- `vite.config.js`：Vite 前端建構工具設定 (包含路徑別名)
- `postcss.config.js`：PostCSS 設定 (包含 Tailwind CSS)
- `tailwind.config.js`：Tailwind CSS 設定

## 功能特色

- 透過 Web 介面或 CLI 工具：
  - 從 Google Sheet 下載多語系資料到本地 `entire.json` 並生成各語言的 JSON 檔案到 `locales/` 目錄下。
  - 將本地 `entire.json` 的新增/修改/刪除資料同步到 Google Sheet (只推送差異)。
- Web 操作介面 (使用 Vite + React 和 Tailwind CSS)，提供：
  - 一鍵下載 Google Sheet 資料並生成語系檔案。
  - 瀏覽 Google Sheet 中的所有語系資料 (分頁顯示)。
  - 新增多語系資料 (輸入分類、key 和各語系的值)。
  - 刪除 Google Sheet 中的指定資料行。
  - 重置本地 `entire.json` 檔案。

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
5.  **安裝 shadcn/ui 元件:** 根據需求，可能需要執行 `npx shadcn-ui add <component-name>` 來添加所需的 UI 元件 (例如 `input`, `table` 等)。

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

編輯 `shared/i18n-config.ts` 檔案，填寫你的 Google Sheet 資訊：

```typescript
const config = {
  sheetId: "YOUR_SPREADSHEET_ID", // 你的 Google Sheet 試算表網址列上的 ID
  auth: "../backend/googleApi.json", // 你的 Google Service Account Key 檔案路徑 (相對於 shared 資料夾)
  langs: ["zh-TW", "en-US", "zh-CN", "zh-HK", "vi-VN"], // 你的多語系列表
  sheetName: "Translations", // 你的 Google Sheet 中實際存放資料的工作表名稱 (必須完全匹配)
  baseLang: "zh-TW", // 基礎語言 (用於新增時的必填檢查)
};

export default config;
```

- `sheetId`: 這是你的 Google Sheet 試算表網址中的那串長 ID。
- `sheetName`: **請確保這個名稱與你的 Google Sheet 中實際存放語系資料的** **工作表 (Sheet) 名稱** **完全一致 (包含大小寫和空格)。**

## 使用方法

### 1. Web 介面 (推薦)

1.  啟動 Web 伺服器：
    ```bash
    pnpm exec ts-node backend/server.ts
    ```
    伺服器會在 http://localhost:3005 啟動。
2.  啟動前端開發伺服器：
    ```bash
    pnpm dev
    ```
    前端介面通常會在 http://localhost:5173 (Vite 預設) 啟動。
3.  打開瀏覽器，訪問前端介面網址。
4.  在介面上，你可以：
    - 點擊按鈕下載 Google Sheet 資料並生成本地語系檔案。
    - 瀏覽現有的語系資料表格。
    - 在下方表單輸入分類、key 和各語系的值新增資料。
    - 點擊每行資料最後的「刪除」按鈕，刪除 Google Sheet 中的對應資料。
    - 點擊「重置 Local 資料」按鈕清空本地 entire.json 檔案。

### 2. CLI (Command Line Interface)

(請根據實際 CLI 功能自行更新此部分)

通常用於自動化流程。

- **下載 Google Sheet 資料並生成本地語系檔案:**

  ```bash
  # 範例指令，請根據你的 CLI 實作進行調整
  pnpm exec ts-node bin/cli.ts --download
  ```

- **同步本地 entire.json 的新增資料到 Google Sheet:**
  ```bash
  # 範例指令，請根據你的 CLI 實作進行調整
  pnpm exec ts-node bin/cli.ts --sync
  ```

## 開發

- 後端程式碼在 `backend/` 資料夾。
- 前端程式碼在 `frontend/` 資料夾。
- 共用程式碼 (設定、類型) 在 `shared/` 資料夾。

修改後端檔案後，重新啟動 `pnpm exec ts-node backend/server.ts`。
修改前端檔案後，如果 `pnpm dev` 正在運行，通常會自動更新。

## 注意事項

- Google Sheets API 的操作可能需要一些時間。
- 請妥善保管你的 `googleApi.json` 檔案，不要將其暴露在公開的程式碼倉庫中。
- 刪除和同步功能直接操作 Google Sheet，請謹慎使用。

---

```

```
