// src/components/BulkActions.jsx

const BulkActions = ({ onDeleteCompleted, hasCompletedTasks }) => {
  if (!hasCompletedTasks) {
    return null;
  }

  return (
    <section className="mt-4 text-center">
      <button 
        onClick={onDeleteCompleted}
        aria-label="完了したタスクをすべて削除する"
        className="text-text-sub dark:text-gray-400 hover:text-error hover:underline"
      >
        完了タスクを一括削除
      </button>
    </section>
  );
};

export default BulkActions;
