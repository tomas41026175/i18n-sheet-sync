export interface SheetConfig {
  sheetId: string;
  auth: string; // path to service account JSON
  langs: string[];
  sheetName?: string;
  baseLang?: string;
}

export type TranslationJson = Record<string, string>;

export interface TranslationRow {
  cate: string;
  key: string;
  "zh-TW": string;
  "en-US"?: string;
  "zh-CN"?: string;
  "zh-HK"?: string;
  "vi-VN"?: string;
}
