export interface SheetConfig {
  sheetId: string;
  auth: string; // path to service account JSON
  langs: string[];
  sheetName?: string;
  baseLang: string;
}

export type TranslationJson = Record<string, string>;
