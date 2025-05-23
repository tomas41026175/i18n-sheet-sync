interface I18nConfig {
  sheetId: string;
  auth: string;
  langs: string[];
  sheetName?: string;
  baseLang?: string;
}

const config: I18nConfig = {
  sheetId: "1Pi_siQaZzjEzULQJdI_P--egUB8w2gWJ1qBIcEiwP1E",
  auth: "../backend/googleApi.json",
  langs: ["zh-TW", "en-US", "zh-CN", "zh-HK", "vi-VN"],
  sheetName: "Translations",
  baseLang: "zh-TW",
};

export default config;
