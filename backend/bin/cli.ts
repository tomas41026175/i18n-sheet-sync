#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs/promises";
import { downloadSheetToJson, syncJsonToSheet } from "../sync";

const program = new Command();

program
  .option("--json <path>", "Path to i18n JSON file")
  .option("--config <path>", "Path to config file (JSON)")
  .option("--sheet-id <id>", "Google Sheet ID")
  .option("--auth <path>", "Path to Google Service Account JSON")
  .option("--langs <list>", "Comma-separated list of langs")
  .option("--sheet-name <name>", "Sheet name", "Translations")
  .option("--base-lang <lang>", "Base language (default: en)", "en")
  .option("--download", "Download sheet data to local JSON")
  .option("--out <path>", "Output path for downloaded JSON");

program.parse();

(async () => {
  const opts = program.opts();

  const config = opts.config
    ? JSON.parse(await fs.readFile(path.resolve(opts.config), "utf-8"))
    : {
        sheetId: opts.sheetId,
        auth: opts.auth,
        langs: opts.langs.split(","),
        sheetName: opts.sheetName,
        baseLang: opts.baseLang,
      };

  if (opts.download) {
    const outPath = opts.out
      ? path.resolve(opts.out)
      : path.resolve("entire.json");
    if (!opts.out) {
      console.log("未指定 --out，將下載資料寫入 entire.json");
    }
    await downloadSheetToJson(config, outPath);
  } else {
    if (!opts.json) {
      console.error("請指定 --json <path> 作為上傳來源");
      process.exit(1);
    }
    await syncJsonToSheet(path.resolve(opts.json), config);
  }
})();
