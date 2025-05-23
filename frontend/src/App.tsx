import SheetSyncApp from "./components/SheetSyncApp";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 導航欄 */}
      {/* <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">
                i18n Sheet Sync
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                同步
              </button>
            </div>
          </div>
        </div>
      </nav> */}

      {/* 主要內容區域 */}
      <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-0 sm:px-2">
          <div className="mx-4">
            <SheetSyncApp />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
