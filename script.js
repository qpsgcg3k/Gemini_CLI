document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const filters = document.getElementById('filters');
    const clearCompletedButton = document.getElementById('clear-completed-button');
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');

    let currentFilter = 'all';
    let draggedItem = null;

    // --- Core Functions ---
    const updateApp = () => {
        saveTasks();
        updateTaskCount();
        filterTasks();
    };

    const loadApp = () => {
        loadTheme();
        loadTasks();
    };

    // --- Task Management ---
    const loadTasks = () => {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        taskList.innerHTML = '';
        tasks.forEach(task => createTaskElement(task.text, task.completed, task.dueDate));
        updateApp();
    };

    const saveTasks = () => {
        const tasks = [];
        document.querySelectorAll('#task-list li').forEach(listItem => {
            tasks.push({
                text: listItem.querySelector('.task-text').textContent,
                completed: listItem.classList.contains('completed'),
                dueDate: listItem.dataset.dueDate || null
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    const createTaskElement = (text, completed, dueDate) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('draggable', 'true');
        if (completed) listItem.classList.add('completed');
        if (dueDate) listItem.dataset.dueDate = dueDate;

        const taskDetails = document.createElement('div');
        taskDetails.classList.add('task-details');

        const taskSpan = document.createElement('span');
        taskSpan.textContent = text;
        taskSpan.classList.add('task-text');

        const dueDateSpan = document.createElement('span');
        dueDateSpan.classList.add('due-date');
        updateDueDateDisplay(dueDateSpan, dueDate);

        taskDetails.appendChild(taskSpan);
        taskDetails.appendChild(dueDateSpan);

        const taskActions = document.createElement('div');
        taskActions.classList.add('task-actions');

        const dateButton = document.createElement('button');
        dateButton.innerHTML = '<i class="fa-solid fa-calendar-days"></i>';
        dateButton.classList.add('date-button');

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';
        editButton.classList.add('edit-button');

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteButton.classList.add('delete-button');

        // Event Listeners for elements
        addDragAndDropListeners(listItem);
        taskSpan.addEventListener('click', () => toggleCompleted(listItem));
        dateButton.addEventListener('click', () => editDueDate(listItem, dueDateSpan));
        editButton.addEventListener('click', () => editTask(listItem, taskSpan));
        deleteButton.addEventListener('click', () => deleteTask(listItem));

        taskActions.appendChild(dateButton);
        taskActions.appendChild(editButton);
        taskActions.appendChild(deleteButton);
        listItem.appendChild(taskDetails);
        listItem.appendChild(taskActions);
        taskList.appendChild(listItem);
    };

    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') { alert('タスクを入力してください。'); return; }
        createTaskElement(taskText, false, null);
        updateApp();
        taskInput.value = '';
    };

    const toggleCompleted = (listItem) => {
        if (listItem.classList.contains('editing')) return;
        listItem.classList.toggle('completed');
        updateApp();
    };

    const deleteTask = (listItem) => {
        taskList.removeChild(listItem);
        updateApp();
    };

    const editTask = (listItem, taskSpan) => {
        if (listItem.classList.contains('editing')) return;
        listItem.classList.add('editing');
        const originalText = taskSpan.textContent;
        taskSpan.style.display = 'none';

        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = originalText;
        editInput.classList.add('edit-input');
        listItem.querySelector('.task-details').prepend(editInput);
        editInput.focus();

        const finishEditing = () => {
            const newText = editInput.value.trim();
            taskSpan.textContent = newText || originalText;
            listItem.querySelector('.task-details').removeChild(editInput);
            taskSpan.style.display = '';
            listItem.classList.remove('editing');
            updateApp();
        };
        editInput.addEventListener('blur', finishEditing);
        editInput.addEventListener('keypress', e => { if (e.key === 'Enter') editInput.blur(); });
    };

    const editDueDate = (listItem, dueDateSpan) => {
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = listItem.dataset.dueDate || '';
        dateInput.style.marginLeft = '10px';
        listItem.querySelector('.task-actions').prepend(dateInput);
        dateInput.focus();

        const finishDateEditing = () => {
            listItem.dataset.dueDate = dateInput.value;
            updateDueDateDisplay(dueDateSpan, dateInput.value);
            listItem.querySelector('.task-actions').removeChild(dateInput);
            updateApp();
        };
        dateInput.addEventListener('blur', finishDateEditing);
        dateInput.addEventListener('change', finishDateEditing);
    };

    const updateDueDateDisplay = (span, dueDate) => {
        if (dueDate) {
            const date = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            span.textContent = `期日: ${date.toLocaleDateString()}`;
            span.classList.toggle('overdue', date < today);
        } else {
            span.textContent = '';
            span.classList.remove('overdue');
        }
    };

    // --- UI & Filters ---
    const updateTaskCount = () => {
        const activeTasks = document.querySelectorAll('#task-list li:not(.completed)').length;
        taskCount.textContent = `未完了: ${activeTasks}件`;
    };

    const filterTasks = () => {
        const searchTerm = searchInput.value.toLowerCase();
        document.querySelectorAll('#task-list li').forEach(item => {
            const taskText = item.querySelector('.task-text').textContent.toLowerCase();
            const isCompleted = item.classList.contains('completed');
            const matchesSearch = taskText.includes(searchTerm);

            let matchesFilter = false;
            if (currentFilter === 'all') {
                matchesFilter = true;
            } else if (currentFilter === 'active' && !isCompleted) {
                matchesFilter = true;
            } else if (currentFilter === 'completed' && isCompleted) {
                matchesFilter = true;
            }

            if (matchesFilter && matchesSearch) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
        document.querySelectorAll('.filters button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === currentFilter);
        });
    };

    // --- Drag and Drop ---
    const addDragAndDropListeners = (item) => {
        item.addEventListener('dragstart', () => {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
        });
        item.addEventListener('dragend', () => {
            setTimeout(() => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                saveTasks();
            }, 0);
        });
    };

    taskList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedItem);
        } else {
            taskList.insertBefore(draggedItem, afterElement);
        }
    });

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    // --- Theme Management ---
    const loadTheme = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }
    };

    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };

    // --- Initial Event Listeners ---
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
    filters.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            currentFilter = e.target.dataset.filter;
            updateApp();
        }
    });
    clearCompletedButton.addEventListener('click', () => {
        document.querySelectorAll('#task-list li.completed').forEach(deleteTask);
    });
    themeToggle.addEventListener('change', toggleTheme);
    searchInput.addEventListener('input', updateApp);

    // --- App Initialization ---
    loadApp();
});