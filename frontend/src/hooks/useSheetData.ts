import { useState } from "react";
import { TranslationRow } from "shared/types";

// 定義 TranslationRow 介面，如果這個介面在其他地方也會用到，可以考慮移動到一個共用的檔案

function useSheetData() {
  const [tableData, setTableData] = useState<TranslationRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // 載入所有語系資料
  const loadData = async () => {
    try {
      const res = await fetch(
        `http://localhost:${import.meta.env.VITE_API_PORT}/data`
      );

      const result = await res.json();
      console.log("result ", result);
      if (result.success) {
        setTableData(result.data);
        // 提取並設定分類列表
        const uniqueCates = new Set<string>();
        result.data.forEach((row: TranslationRow) => uniqueCates.add(row.cate));
        setCategories(Array.from(uniqueCates));
      } else {
        // 處理載入失敗
        console.error("載入資料失敗:", result.message);
        setTableData([]); // 清空資料或顯示錯誤訊息
      }
    } catch (error) {
      console.error("載入資料時發生錯誤:", error);
      setTableData([]); // 清空資料或顯示錯誤訊息
    }
  };

  // 元件載入時自動載入資料
  // useEffect(() => {
  //   loadData();
  // }, []); // 空陣列表示只在元件掛載時執行一次

  // 返回狀態和載入資料的函式
  return { tableData, categories, loadData };
}

export default useSheetData;
