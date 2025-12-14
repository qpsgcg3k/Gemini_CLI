import { useState } from 'react';

const TaskInput = ({ onAddTask }) => {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onAddTask(trimmedText);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <section className="mt-4">
      <h2 className="sr-only">タスクの追加</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="新しいタスクを入力..."
          aria-label="新しいタスク"
          className="flex-grow p-3 border border-border-gray rounded-lg focus:ring-2 focus:ring-main-blue focus:border-main-blue"
        />
        <button
          onClick={handleAdd}
          aria-label="タスクを追加する"
          className="bg-main-blue text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-main-blue focus:ring-offset-2"
        >
          追加
        </button>
      </div>
    </section>
  );
};

export default TaskInput;
