// src/components/TaskFilter.jsx

const TaskFilter = ({ 
  filter, 
  setFilter, 
  searchTerm, 
  setSearchTerm,
  activeTaskCount,
  tagFilter,
  setTagFilter,
  sortBy,
  setSortBy
}) => {
  return (
    <section className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* -- Search Input -- */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="タスクを検索..."
          aria-label="タスクを検索"
          className="w-full p-2 border bg-white dark:bg-gray-700 border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue"
        />

        {/* -- Tag Filter Input -- */}
        <input
          type="text"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="タグで絞り込み..."
          aria-label="タグで絞り込み"
          className="w-full p-2 border bg-white dark:bg-gray-700 border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue"
        />

        {/* -- Status Filter Dropdown -- */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="タスクのフィルタリング"
          className="w-full p-2 border bg-white dark:bg-gray-700 border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue"
        >
          <option value="all">すべて</option>
          <option value="active">未完了</option>
          <option value="completed">完了済み</option>
          <option value="recurring">繰り返し</option>
        </select>

        {/* -- Sort By Dropdown -- */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="タスクの並べ替え"
          className="w-full p-2 border bg-white dark:bg-gray-700 border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue"
        >
          <option value="default">作成順</option>
          <option value="priority">優先度順</option>
        </select>
      </div>

      <div className="text-right">
        <span className="text-text-sub dark:text-gray-300 font-medium">
          未完了タスク: {activeTaskCount}
        </span>
      </div>
    </section>
  );
};

export default TaskFilter;
