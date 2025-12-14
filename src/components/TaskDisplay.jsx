// src/components/TaskDisplay.jsx
import clsx from 'clsx';

const TaskDisplay = ({ task, onToggleCompleted, setEditingTaskId }) => {
    return (
        <div className="flex-grow">
            <span
                onClick={() => onToggleCompleted(task.id)}
                className={clsx('cursor-pointer', {
                    'text-text-main dark:text-gray-100': !task.completed,
                    'text-text-caption dark:text-gray-500 line-through': task.completed
                })}
            >
                {task.text}
            </span>
            {task.dueDate && (
                <div className="flex items-center gap-2 mt-2 text-sm text-text-caption">
                    <span>期日: {task.dueDate}</span>
                </div>
            )}
        </div>
    );
};

export default TaskDisplay;
