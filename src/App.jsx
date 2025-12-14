import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import TaskFilter from './components/TaskFilter';
import TaskList from './components/TaskList';
import BulkActions from './components/BulkActions';
import Export from './components/Export';
import RecurrenceModal from './components/RecurrenceModal';
import { updateTask } from './modules/taskStore';

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('tasks');
    // ... (rest of the lazy initializer)
        if (savedTasks) {
      try {
        return JSON.parse(savedTasks);
      } catch (e) {
        console.error("ローカルストレージからのタスク読み込みに失敗しました。", e);
        // Fallback to default tasks if parsing fails
      }
    }
    return [
      { id: 1, text: "Reactの勉強をする", completed: false, dueDate: "2025-12-31", recurrence: null, tags: ["学習"], priority: "high", createdAt: Date.now() - 200000 },
      { id: 2, text: "デザインルールを確認する", completed: true, dueDate: "2025-12-30", recurrence: null, tags: ["設計"], priority: "medium", createdAt: Date.now() - 100000 }
    ];
  });

  const [filter, setFilter] = useState('all'); // all, active, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });
  const [modalTaskId, setModalTaskId] = useState(null); // State to control modal visibility and content
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState('default'); // 'default', 'priority'
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [editingRecurrenceTask, setEditingRecurrenceTask] = useState(null);


  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
// ... (rest of theme useEffect)
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropTaskId) => {
    e.preventDefault();
    const draggedTaskId = parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (draggedTaskId === dropTaskId) {
      setDraggingTaskId(null);
      return;
    }

    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const dropIndex = tasks.findIndex(t => t.id === dropTaskId);
    
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, draggedTask);

    setTasks(newTasks);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };


  const handleAddTask = (text) => {
// ... (rest of handleAddTask)
    const newTask = {
      id: Date.now(),
      text: text,
      completed: false,
      dueDate: null,
      recurrence: null,
      tags: [],
      priority: "medium",
      createdAt: Date.now()
    };
    setTasks([newTask, ...tasks]);
  };

  const handleDeleteTask = (taskId) => {
// ... (rest of handleDeleteTask)
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleToggleCompleted = (taskId) => {
// ... (rest of handleToggleCompleted)
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleUpdateTask = (taskId, updatedData) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, ...updatedData } : task
    ));
    setEditingTaskId(null);
  };

  const openRecurrenceModal = (task) => {
    setEditingRecurrenceTask(task);
    setIsRecurrenceModalOpen(true);
  };

  const closeRecurrenceModal = () => {
    setEditingRecurrenceTask(null);
    setIsRecurrenceModalOpen(false);
  };

  const handleSaveRecurrence = (updatedTask) => {
    updateTask(updatedTask);
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleDeleteCompleted = () => {
    setTasks(tasks.filter(task => !task.completed));
  };

  const handleExportCSV = (exportType) => {
    let tasksToExport = [];
    if (exportType === 'active') {
      tasksToExport = tasks.filter(task => !task.completed);
    } else if (exportType === 'completed') {
      tasksToExport = tasks.filter(task => task.completed);
    } else {
      tasksToExport = tasks; // 'all'
    }

    const headers = ['タスク名', '状態', '期日', 'タグ', '優先度', '作成日'];
    const csvRows = [
      headers.join(','),
      ...tasksToExport.map(task => {
        const status = task.completed ? '完了' : '未完了';
        const dueDate = task.dueDate || '';
        const tags = task.tags ? task.tags.join(';') : ''; // Semicolon as tag separator
        const priority = task.priority || '';
        const createdAtDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('ja-JP') : '';
        return `"${task.text.replace(/"/g, '""')}",${status},${dueDate},"${tags.replace(/"/g, '""')}",${priority},${createdAtDate}`;
      })
    ];

    const csvString = '\ufeff' + csvRows.join('\n'); // Add BOM for UTF-8 compatibility
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'tasks.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTaskCount = tasks.filter(task => !task.completed).length;
  const hasCompletedTasks = tasks.some(task => task.completed);

  const filteredAndSortedTasks = useMemo(() => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    let processedTasks = tasks.filter(task => {
      const statusMatch = (filter === 'active' && !task.completed) ||
                          (filter === 'completed' && task.completed) ||
                          (filter === 'recurring' && task.recurrence) ||
                          filter === 'all';
      
      const searchMatch = task.text.toLowerCase().includes(searchTerm.toLowerCase());

      const tagMatch = tagFilter ? task.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase())) : true;

      return statusMatch && searchMatch && tagMatch;
    });

    if (sortBy === 'priority') {
      processedTasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 3;
        const priorityB = priorityOrder[b.priority] || 3;
        return priorityA - priorityB;
      });
    }
    // 'default' sort is the natural order from the 'tasks' state, which is preserved

    return processedTasks;
  }, [tasks, filter, searchTerm, tagFilter, sortBy]);

  return (
    <div className="bg-section-bg dark:bg-text-main min-h-screen font-sans">
      <Header theme={theme} onToggleTheme={handleToggleTheme} />
      <main className="container mx-auto p-4 max-w-4xl">
        <TaskInput onAddTask={handleAddTask} />
        <TaskFilter 
          filter={filter}
          setFilter={setFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTaskCount={activeTaskCount}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
        <TaskList 
          tasks={filteredAndSortedTasks} 
          onDeleteTask={handleDeleteTask}
          onToggleCompleted={handleToggleCompleted} 
          editingTaskId={editingTaskId}
          setEditingTaskId={setEditingTaskId}
          onUpdateTask={handleUpdateTask}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggingTaskId={draggingTaskId}
          onOpenRecurrenceModal={openRecurrenceModal}
        />
        <BulkActions 
          onDeleteCompleted={handleDeleteCompleted}
          hasCompletedTasks={hasCompletedTasks}
        />
        <Export onExportCSV={handleExportCSV} />
      </main>
      <RecurrenceModal
        isOpen={isRecurrenceModalOpen}
        onClose={closeRecurrenceModal}
        task={editingRecurrenceTask}
        onSave={handleSaveRecurrence}
      />
    </div>
  )
}

export default App
