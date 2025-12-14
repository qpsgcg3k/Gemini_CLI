import { useState, useEffect } from 'react';
import clsx from 'clsx';

const priorityMap = {
  high: { label: '高', color: 'text-red-500', ring: 'ring-red-500' },
  medium: { label: '中', color: 'text-yellow-500', ring: 'ring-yellow-500' },
  low: { label: '低', color: 'text-green-500', ring: 'ring-green-500' },
};


const TaskItem = ({ 
  task, 
  onDeleteTask, 
  onToggleCompleted,
  isEditing,
  setEditingTaskId,
  onUpdateTask,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  onOpenRecurrenceModal
}) => {
  const [editData, setEditData] = useState({
    text: task.text,
    dueDate: task.dueDate || '',
    tags: task.tags?.join(', ') || '',
    priority: task.priority || 'medium',
  });

  useEffect(() => {
    if (isEditing) {
      setEditData({
        text: task.text,
        dueDate: task.dueDate || '',
        tags: task.tags?.join(', ') || '',
        priority: task.priority || 'medium',
      });
    }
  }, [isEditing, task]);

  const handleSave = () => {
    const trimmedText = editData.text.trim();
    if (!trimmedText) return; // Do not save if text is empty

    onUpdateTask(task.id, {
      ...editData,
      tags: editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      dueDate: editData.dueDate || null,
    });
    setEditingTaskId(null);
  };
  
  const handleCancel = () => {
    setEditingTaskId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for newlines in future
        e.preventDefault();
        handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const containerClasses = clsx('p-4 border rounded-2xl shadow-sm transition-all', {
    'bg-white dark:bg-gray-800 border-border-gray dark:border-gray-700': !task.completed,
    'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-text-caption dark:text-gray-500': task.completed,
    'opacity-50 border-dashed': isDragging,
  });

  const priorityInfo = priorityMap[task.priority] || priorityMap.medium;

  return (
    <li 
      className={containerClasses}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, task.id)}
      onDragEnd={onDragEnd}
      data-task-id={task.id}
      onKeyDown={isEditing ? handleKeyDown : undefined}
    >
      {isEditing ? (
        // -- Edit Mode --
        <div className="space-y-3">
          <input
            type="text"
            value={editData.text}
            onChange={(e) => setEditData({ ...editData, text: e.target.value })}
            className="w-full p-2 border border-main-blue rounded-md bg-white dark:bg-gray-700"
            autoFocus
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block mb-1 font-medium text-text-caption dark:text-gray-400">期日</label>
              <input
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-text-caption dark:text-gray-400">タグ (カンマ区切り)</label>
              <input
                type="text"
                value={editData.tags}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-text-caption dark:text-gray-400">優先度</label>
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">キャンセル</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-main-blue rounded-md hover:bg-opacity-90">保存</button>
          </div>
        </div>
      ) : (
        // -- Display Mode --
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <div className="flex items-start gap-3">
              <span className="cursor-grab text-text-caption pt-1">⠿</span>
              <div className="flex-grow">
                <span
                  onClick={() => onToggleCompleted(task.id)}
                  className={clsx('cursor-pointer', {
                    'text-text-main dark:text-gray-100': !task.completed,
                    'line-through': task.completed
                  })}
                >
                  {task.text}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <span>期日: {task.dueDate}</span>
                    </div>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {task.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 flex-shrink-0">
            <span className={clsx('mr-2 text-sm font-bold', priorityInfo.color)}>{priorityInfo.label}</span>
            <button
              aria-label="繰り返し設定"
              className="p-2 hover:bg-middle-blue rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onOpenRecurrenceModal(task)}
              disabled={task.completed}
            >
              🔄
            </button>
            <button 
              aria-label="編集" 
              className="p-2 hover:bg-middle-blue rounded-full disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={task.completed}
              onClick={() => setEditingTaskId(task.id)}
            >
              ✏️
            </button>
            <button 
              aria-label="削除" 
              className="p-2 hover:bg-middle-blue rounded-full"
              onClick={() => onDeleteTask(task.id)}
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </li>
  );
};
