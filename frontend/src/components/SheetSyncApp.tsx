import React, { useState } from "react";
import useSheetData from "../hooks/useSheetData";

export interface TranslationRow {
  cate: string;
  key: string;
  "zh-TW": string;
  "en-US"?: string;
  "zh-CN"?: string;
  "zh-HK"?: string;
  "vi-VN"?: string;
}

function SheetSyncApp() {
  const { tableData, categories, loadData } = useSheetData(); // 使用 useSheetData Hook

  const [sheetName, setSheetName] = useState("");
  const [downloadResult, setDownloadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [addFormData, setAddFormData] = useState({
    cate: "",
    key: "",
    "zh-TW": "",
  });
  const [addResult, setAddResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Initial data load
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 下載並產生語系檔案
  const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDownloadResult(null); // 清空之前的結果

    try {
      const res = await fetch(`http://localhost:${import.meta.env.VITE_API_PORT}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName }),
      }).then((r) => r.json());

      setDownloadResult(res);
    } catch (error) {
      console.error("下載時發生錯誤:", error);
      setDownloadResult({ success: false, message: "下載時發生錯誤" });
    }
  };

  // 新增多語系資料
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddResult(null); // 清空之前的結果

    try {
      const res = await fetch(`http://localhost:${import.meta.env.VITE_API_PORT}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addFormData),
      }).then((r) => r.json());

      setAddResult(res);

      if (res.success) {
        loadData(); // 新增成功後重新載入資料
        // 清空表單
        setAddFormData({ cate: "", key: "", "zh-TW": "" });
      }
    } catch (error) {
      console.error("新增時發生錯誤:", error);
      setAddResult({ success: false, message: "新增時發生錯誤" });
    }
  };

  // 刪除多語系資料
  const handleDelete = async (cate: string, key: string) => {
    if (!window.confirm(`確定要刪除分類: ${cate}, key: ${key} 這筆資料嗎？`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:${import.meta.env.VITE_API_PORT}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cate, key }),
      }).then((r) => r.json());

      alert(res.message); // 使用 alert 顯示結果，如同原 HTML

      if (res.success) {
        loadData(); // 刪除成功後重新載入資料
      }
    } catch (error) {
      console.error("刪除時發生錯誤:", error);
      alert("刪除時發生錯誤"); // 使用 alert 顯示錯誤
    }
  };

  return (
    <div className="p-0 space-y-6">
      <h1>i18n Sheet Sync 操作介面</h1>

      {/* 下載表單 */}
      <form onSubmit={handleDownload} className="mb-4 space-y-4 p-4 border border-gray-200 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-4">下載語系檔案</h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="sheetName"
              className="block text-sm font-medium text-gray-700"
            >
              Sheet 名稱
            </label>
            <input
              type="text"
              id="sheetName"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Translations"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          下載並產生語系檔案
        </button>
      </form>

      {/* 下載結果顯示 */}
      {downloadResult && (
        <div
          className={`p-3 rounded-md ${
            downloadResult.success
              ? "bg-green-100 border border-green-400 text-green-700"
              : "bg-red-100 border border-red-400 text-red-700"
          }`}
        >
          {downloadResult.message}
        </div>
      )}

      <h2>所有語系資料</h2>
      <div style={{ maxHeight: "500px", overflowY: "auto" }} className="border border-gray-200 rounded-md shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分類
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                zh-TW
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                en-US
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                zh-CN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                zh-HK
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                vi-VN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row: TranslationRow, index: number) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.cate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.key}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["zh-TW"] || ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["en-US"] || ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["zh-CN"] || ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["zh-HK"] || ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["vi-VN"] || ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => handleDelete(row.cate, row.key)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>新增多語系資料</h2>
      <form onSubmit={handleAdd} className="mb-4 space-y-4 p-4 border border-gray-200 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-4">新增多語系資料</h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="addCate"
              className="block text-sm font-medium text-gray-700"
            >
              分類
            </label>
            <input
              list="cateList"
              id="addCate"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              value={addFormData.cate}
              onChange={(e) =>
                setAddFormData({ ...addFormData, cate: e.target.value })
              }
            />
            <datalist id="cateList">
              {categories.map((cate: string, index: number) => (
                <option key={index} value={cate} />
              ))}
            </datalist>
          </div>
          <div>
            <label
              htmlFor="addKey"
              className="block text-sm font-medium text-gray-700"
            >
              key
            </label>
            <input
              type="text"
              id="addKey"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              value={addFormData.key}
              onChange={(e) =>
                setAddFormData({ ...addFormData, key: e.target.value })
              }
            />
          </div>
          <div>
            <label
              htmlFor="addZhTW"
              className="block text-sm font-medium text-gray-700"
            >
              zh-TW
            </label>
            <input
              type="text"
              id="addZhTW"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              value={addFormData["zh-TW"]}
              onChange={(e) =>
                setAddFormData({ ...addFormData, "zh-TW": e.target.value })
              }
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          新增
        </button>
      </form>

      {/* 新增結果顯示 */}
      {addResult && (
        <div
          className={`p-3 rounded-md ${
            addResult.success
              ? "bg-green-100 border border-green-400 text-green-700"
              : "bg-red-100 border border-red-400 text-red-700"
          }`}
        >
          {addResult.message}
        </div>
      )}
    </div>
  );
}

export default SheetSyncApp;
