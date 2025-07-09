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
    const exportSelect = document.getElementById('export-select');
    const exportButton = document.getElementById('export-button');

    let currentFilter = 'active';
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
        generateRecurringTasks(); // Generate tasks first
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        taskList.innerHTML = '';
        tasks.forEach(task => createTaskElement(task.text, task.completed, task.dueDate, task.recurrence, task.id));
        updateApp();
    };

    const saveTasks = () => {
        const tasks = [];
        document.querySelectorAll('#task-list li').forEach(listItem => {
            tasks.push({
                id: listItem.dataset.id,
                text: listItem.querySelector('.task-text').textContent,
                completed: listItem.classList.contains('completed'),
                dueDate: listItem.dataset.dueDate || null,
                recurrence: listItem.dataset.recurrence ? JSON.parse(listItem.dataset.recurrence) : null
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    const createTaskElement = (text, completed, dueDate, recurrence, id) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('draggable', 'true');
        listItem.dataset.id = id || Date.now(); // Assign new ID if none exists
        if (completed) listItem.classList.add('completed');
        if (dueDate) listItem.dataset.dueDate = dueDate;
        if (recurrence) {
            listItem.dataset.recurrence = JSON.stringify(recurrence);
            listItem.classList.add('is-template'); // Add class for templates
        }

        const taskDetails = document.createElement('div');
        taskDetails.classList.add('task-details');

        const taskSpan = document.createElement('span');
        taskSpan.textContent = text;
        taskSpan.classList.add('task-text');

        if (recurrence) {
            const templateIcon = document.createElement('i');
            templateIcon.classList.add('fa-solid', 'fa-clone', 'template-icon');
            taskSpan.prepend(templateIcon);
        }

        const dueDateSpan = document.createElement('span');
        dueDateSpan.classList.add('due-date');
        updateDueDateDisplay(dueDateSpan, dueDate);

        const recurrenceSpan = document.createElement('span');
        recurrenceSpan.classList.add('recurrence-status');
        updateRecurrenceDisplay(recurrenceSpan, recurrence);


        taskDetails.appendChild(taskSpan);
        taskDetails.appendChild(dueDateSpan);
        taskDetails.appendChild(recurrenceSpan);

        const taskActions = document.createElement('div');
        taskActions.classList.add('task-actions');

        const repeatButton = document.createElement('button');
        repeatButton.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        repeatButton.classList.add('repeat-button');

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
        repeatButton.addEventListener('click', () => editRecurrence(listItem, recurrenceSpan));
        dateButton.addEventListener('click', () => editDueDate(listItem, dueDateSpan));
        editButton.addEventListener('click', () => editTask(listItem, taskSpan));
        deleteButton.addEventListener('click', () => deleteTask(listItem));

        taskActions.appendChild(repeatButton);
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
        createTaskElement(taskText, false, null, null, null);
        updateApp();
        taskInput.value = '';
    };

    const toggleCompleted = (listItem) => {
        if (listItem.classList.contains('editing') || listItem.classList.contains('is-template')) return;
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

    const recurrenceModal = document.getElementById('recurrence-modal');
    const closeButton = document.querySelector('.close-button');
    const saveRecurrenceButton = document.getElementById('save-recurrence-button');
    const cancelRecurrenceButton = document.getElementById('cancel-recurrence-button');
    const recurrenceType = document.getElementById('recurrence-type');
    const weeklyOptions = document.getElementById('weekly-options');
    const monthlyOptions = document.getElementById('monthly-options');
    const weekdaySelector = document.querySelector('.weekday-selector');
    const monthlyDayInput = document.getElementById('monthly-day');

    let currentEditingListItem = null;

    // --- Modal --- 
    const openRecurrenceModal = (listItem) => {
        currentEditingListItem = listItem;
        const recurrence = JSON.parse(listItem.dataset.recurrence || 'null');

        // Reset fields
        recurrenceType.value = 'none';
        weekdaySelector.querySelectorAll('span').forEach(span => span.classList.remove('selected'));
        monthlyDayInput.value = '';

        if (recurrence) {
            recurrenceType.value = recurrence.type;
            if (recurrence.type === 'weekly') {
                recurrence.days.forEach(dayIndex => {
                    weekdaySelector.children[dayIndex].classList.add('selected');
                });
            } else if (recurrence.type === 'monthly') {
                monthlyDayInput.value = recurrence.day;
            }
        }

        toggleRecurrenceDetails();
        recurrenceModal.style.display = 'block';
    };

    const closeRecurrenceModal = () => {
        recurrenceModal.style.display = 'none';
        currentEditingListItem = null;
    };

    const saveRecurrence = () => {
        if (!currentEditingListItem) return;

        const type = recurrenceType.value;
        let recurrence = null;

        if (type !== 'none') {
            recurrence = { type: type };
            if (type === 'weekly') {
                const selectedDays = [];
                weekdaySelector.querySelectorAll('span.selected').forEach((span, index) => {
                     // Find the index of the span within its parent
                    const dayIndex = Array.prototype.indexOf.call(weekdaySelector.children, span);
                    selectedDays.push(dayIndex);
                });
                if (selectedDays.length === 0) { alert('曜日を少なくとも1つ選択してください。'); return; }
                recurrence.days = selectedDays;
            } else if (type === 'monthly') {
                const day = parseInt(monthlyDayInput.value, 10);
                if (!day || day < 1 || day > 31) { alert('1から31の有効な日付を入力してください。'); return; }
                recurrence.day = day;
            }
        }

        currentEditingListItem.dataset.recurrence = JSON.stringify(recurrence);

        // Update visual indicators immediately
        const existingIcon = currentEditingListItem.querySelector('.template-icon');
        if (existingIcon) {
            existingIcon.remove();
        }

        if (recurrence) {
            currentEditingListItem.classList.add('is-template');
            const templateIcon = document.createElement('i');
            templateIcon.classList.add('fa-solid', 'fa-clone', 'template-icon');
            currentEditingListItem.querySelector('.task-text').prepend(templateIcon);
        } else {
            currentEditingListItem.classList.remove('is-template');
        }

        updateRecurrenceDisplay(currentEditingListItem.querySelector('.recurrence-status'), recurrence);
        updateApp();
        closeRecurrenceModal();
    };

    const toggleRecurrenceDetails = () => {
        weeklyOptions.style.display = recurrenceType.value === 'weekly' ? 'block' : 'none';
        monthlyOptions.style.display = recurrenceType.value === 'monthly' ? 'block' : 'none';
    };


    const editRecurrence = (listItem) => {
        openRecurrenceModal(listItem);
    };

    const updateRecurrenceDisplay = (span, recurrence) => {
        if (recurrence) {
            let text = '繰り返し: ';
            switch(recurrence.type) {
                case 'daily': text += '毎日'; break;
                case 'weekly': text += '毎週'; break; // Could be more specific
                case 'monthly': text += `毎月${recurrence.day}日`; break;
            }
            span.textContent = text;
            span.style.display = 'block';
        } else {
            span.textContent = '';
            span.style.display = 'none';
        }
    };

    const generateRecurringTasks = () => {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newTasksGenerated = false;

        const templates = tasks.filter(t => t.recurrence && t.recurrence.type !== 'none');

        templates.forEach(template => {
            let lastGenerated = template.recurrence.lastGenerated ? new Date(template.recurrence.lastGenerated) : new Date(parseInt(template.id));
            lastGenerated.setHours(0, 0, 0, 0);

            let nextDueDate = new Date(lastGenerated);

            while (nextDueDate < today) {
                // Calculate the next occurrence date
                switch (template.recurrence.type) {
                    case 'daily':
                        nextDueDate.setDate(nextDueDate.getDate() + 1);
                        break;
                    case 'weekly':
                        do {
                            nextDueDate.setDate(nextDueDate.getDate() + 1);
                        } while (!template.recurrence.days.includes(nextDueDate.getDay()));
                        break;
                    case 'monthly':
                        // Simple month increment, has edge cases but works for most scenarios
                        nextDueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, template.recurrence.day);
                        break;
                }

                if (nextDueDate <= today) {
                    const yyyy = nextDueDate.getFullYear();
                    const mm = String(nextDueDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(nextDueDate.getDate()).padStart(2, '0');
                    const dueDateString = `${yyyy}-${mm}-${dd}`;
                    const taskExists = tasks.some(t => t.templateId === template.id && t.dueDate === dueDateString);

                    if (!taskExists) {
                        const newTask = {
                            id: Date.now() + Math.random(), // Unique ID
                            templateId: template.id,
                            text: template.text,
                            completed: false,
                            dueDate: dueDateString,
                            recurrence: null
                        };
                        tasks.push(newTask);
                        newTasksGenerated = true;
                    }
                }
            }
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            template.recurrence.lastGenerated = `${yyyy}-${mm}-${dd}`;
        });

        if (newTasksGenerated) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
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

    // --- CSV Export ---
    const exportTasksToCSV = () => {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const filter = exportSelect.value;

        const filteredTasks = tasks.filter(task => {
            if (filter === 'all') return true;
            if (filter === 'active') return !task.completed;
            if (filter === 'completed') return task.completed;
            return false;
        });

        if (filteredTasks.length === 0) {
            alert('エクスポートするタスクがありません。');
            return;
        }

        let csvContent = '\uFEFF';
        const headers = ['タスク名', '状態', '期日'];
        csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

        filteredTasks.forEach(task => {
            const status = task.completed ? '完了済み' : '未完了';
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
            const taskText = task.text.replace(/"/g, '""');
            const row = [`"${taskText}"`, `"${status}"`, `"${dueDate}"`];
            csvContent += row.join(',') + '\r\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'tasks.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
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
    exportButton.addEventListener('click', exportTasksToCSV);

    // --- Modal Event Listeners ---
    closeButton.addEventListener('click', closeRecurrenceModal);
    cancelRecurrenceButton.addEventListener('click', closeRecurrenceModal);
    saveRecurrenceButton.addEventListener('click', saveRecurrence);
    recurrenceType.addEventListener('change', toggleRecurrenceDetails);
    weekdaySelector.addEventListener('click', e => {
        if (e.target.tagName === 'SPAN') {
            e.target.classList.toggle('selected');
        }
    });
    window.addEventListener('click', e => {
        if (e.target == recurrenceModal) {
            closeRecurrenceModal();
        }
    });

    // --- App Initialization ---
    loadApp();
});