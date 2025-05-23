import React, { useState } from "react";
import useSheetData from "../hooks/useSheetData";
import { TranslationRow } from "shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import EnhancePagination from "./EnhancePagination";

function SheetSyncApp() {
  const { tableData, categories, loadData } = useSheetData(); // 使用 useSheetData Hook

  const itemsPerPage = 50;

  const [sheetName, setSheetName] = useState("Translations");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadResult, setDownloadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [addFormData, setAddFormData] = useState({
    cate: "",
    key: "",
    zhTW: "",
  });
  const [addResult, setAddResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Initial data load
  React.useEffect(() => {
    loadData();
  }, []);

  const downloadReqFunc = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    const res = await fetch(
      `http://localhost:${import.meta.env.VITE_API_PORT}/download`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`HTTP error! status: ${res.status}`, errorBody);

      return {
        success: false,
        message: `下載失敗: ${res.status}`,
      };
    }
    return res.json();
  };

  // 下載並產生語系檔案
  const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDownloadResult(null); // 清空之前的結果

    try {
      const result = await downloadReqFunc();

      setDownloadResult(result);
      loadData();
    } catch (error) {
      console.error("下載時發生錯誤:", error);
      setDownloadResult({ success: false, message: "下載時發生錯誤" });
    }
  };

  const handleReset = async (e: any) => {
    e.preventDefault();
    // setDownloadResult(null); // 清空之前的結果 - 暫時註解掉，後面根據後端回覆設定狀態

    try {
      const res = await fetch(
        `http://localhost:${import.meta.env.VITE_API_PORT}/resetLocal`, // 修正路由為 /resetLocal
        {
          method: "POST", // 修正方法為 POST
          headers: { "Content-Type": "application/json" },
          // body: JSON.stringify({ sheetName }), // 重置不需要 body
        }
      );

      const result = await res.json(); // 獲取後端回覆

      setDownloadResult(result); // 根據後端回覆更新狀態
      loadData();
      // 移除自動下載行為
      // const result = await downloadReqFunc();
      // setDownloadResult(result);
    } catch (error: any) {
      console.error("重置時發生錯誤:", error);
      setDownloadResult({
        success: false,
        message: `重置時發生錯誤: ${error.message}`,
      });
    }
  };

  // 新增多語系資料
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddResult(null); // 清空之前的結果

    try {
      const res = await fetch(
        `http://localhost:${import.meta.env.VITE_API_PORT}/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addFormData),
        }
      ).then((r) => r.json());

      setAddResult(res);

      if (res.success) {
        loadData(); // 新增成功後重新載入資料
        // 清空表單
        setAddFormData({ cate: "", key: "", zhTW: "" });
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
      const res = await fetch(
        `http://localhost:${import.meta.env.VITE_API_PORT}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cate, key }),
        }
      ).then((r) => r.json());

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
      <form
        onSubmit={handleDownload}
        className="mb-4 space-y-4 p-4 border border-gray-200 rounded-md shadow-sm"
      >
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

      <button
        type="button"
        onClick={handleReset}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        重置 Local 資料
      </button>

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
      <div
        style={{ maxHeight: "500px", overflowY: "auto" }}
        className="border border-gray-200 rounded-md shadow-sm max-w-full mx-auto"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">分類</TableHead>
              <TableHead className="w-[100px]">key</TableHead>
              <TableHead className="w-[100px]">zh-TW</TableHead>
              <TableHead className="w-[100px]">en-US</TableHead>
              <TableHead className="w-[100px]">zh-CN</TableHead>
              <TableHead className="w-[100px]">zh-HK</TableHead>
              <TableHead className="w-[100px]">vi-VN</TableHead>
              <TableHead className="text-right w-[50px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((row: TranslationRow, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium w-[15%]">
                    {row.cate}
                  </TableCell>
                  <TableCell className="w-[100px]">{row.key}</TableCell>
                  <TableCell className="w-[100px]">
                    {row["zh-TW"] || ""}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {row["en-US"] || ""}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {row["zh-CN"] || ""}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {row["zh-HK"] || ""}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {row["vi-VN"] || ""}
                  </TableCell>
                  <TableCell className="text-right w-[50px]">
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={() => handleDelete(row.cate, row.key)}
                    >
                      刪除
                    </button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <EnhancePagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={50}
        dataLength={tableData.length}
        maxView={7}
      />

      <h2>新增多語系資料</h2>
      <form
        onSubmit={handleAdd}
        className="mb-4 space-y-4 p-4 border border-gray-200 rounded-md shadow-sm"
      >
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
              value={addFormData["zhTW"]}
              onChange={(e) =>
                setAddFormData({ ...addFormData, zhTW: e.target.value })
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
