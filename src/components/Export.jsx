import { useState } from 'react';

const Export = ({ onExportCSV }) => {
  const [exportType, setExportType] = useState('all');

  return (
    <section className="mt-6 p-4 bg-section-bg dark:bg-gray-800 rounded-2xl">
      <div className="flex items-center justify-center gap-4">
        <select 
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          aria-label="エクスポートするタスクの選択"
          className="p-2 border border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue"
        >
          <option value="all">すべてのタスク</option>
          <option value="active">未完了のタスク</option>
          <option value="completed">完了済みのタスク</option>
        </select>
        <button
          onClick={() => onExportCSV(exportType)}
          aria-label="CSV形式でタスクをエクスポートする"
          className="bg-white border-2 border-emphasis-blue text-emphasis-blue font-semibold px-6 py-2 rounded-xl shadow-sm hover:bg-light-blue focus:outline-none focus:ring-2 focus:ring-main-blue focus:ring-offset-2"
        >
          CSV出力
        </button>
      </div>
    </section>
  );
};

export default Export;
