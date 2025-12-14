// src/components/TaskList.jsx
import TaskItem from './TaskItem';

const TaskList = ({ 
  tasks, 
  onDeleteTask, 
  onToggleCompleted,
  editingTaskId,
  setEditingTaskId,
  onUpdateTask,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggingTaskId,
  onOpenRecurrenceModal
}) => {
  return (
    <section className="mt-4">
      <h2 className="sr-only">タスク一覧</h2>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task}
            onDeleteTask={onDeleteTask}
            onToggleCompleted={onToggleCompleted}
            isEditing={editingTaskId === task.id}
            setEditingTaskId={setEditingTaskId}
            onUpdateTask={onUpdateTask}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            isDragging={draggingTaskId === task.id}
            onOpenRecurrenceModal={onOpenRecurrenceModal}
          />
        ))}
      </ul>
    </section>
  );
};

export default TaskList;
