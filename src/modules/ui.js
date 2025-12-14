// src/modules/ui.js
import { getTasks, updateTask, deleteTask as deleteTaskFromStore, clearCompletedTasks } from './taskStore.js';

let draggedItem = null;

// DOM Elements (assuming they are loaded in the main script)
let taskList;
let taskCount;
let filterSelect;
let searchInput;
let tagFilterSelect;
let prioritySortSelect;
let clearCompletedButton;

export const initializeDOMElements = () => {
    taskList = document.getElementById('task-list');
    taskCount = document.getElementById('task-count');
    filterSelect = document.getElementById('filter-select');
    searchInput = document.getElementById('search-input');
    tagFilterSelect = document.getElementById('tag-filter-select');
    prioritySortSelect = document.getElementById('priority-sort-select');
    clearCompletedButton = document.getElementById('clear-completed-button');
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

const updateRecurrenceDisplay = (span, recurrence) => {
    if (recurrence) {
        let text = '繰り返し: ';
        switch(recurrence.type) {
            case 'daily': text += '毎日'; break;
            case 'weekly': text += '毎週'; break;
            case 'monthly': text += `毎月${recurrence.day}日`; break;
        }
        span.textContent = text;
        span.style.display = 'block';
    } else {
        span.textContent = '';
        span.style.display = 'none';
    }
};

const updateTagsDisplay = (span, tags) => {
    if (tags && tags.length > 0) {
        span.textContent = `タグ: ${tags.join(', ')}`;
        span.style.display = 'block';
    } else {
        span.textContent = '';
        span.style.display = 'none';
    }
};

const updatePriorityDisplay = (span, priority) => {
    span.classList.remove('priority-high', 'priority-medium', 'priority-low');

    if (priority && priority !== 'none') {
        let displayPriority = '';
        switch (priority) {
            case 'high': displayPriority = '高'; break;
            case 'medium': displayPriority = '中'; break;
            case 'low': displayPriority = '低'; break;
        }
        span.textContent = `優先度: ${displayPriority}`;
        span.classList.add(`priority-${priority}`);
        span.style.display = 'block';
    } else {
        span.textContent = '';
        span.style.display = 'none';
    }
};

const updateCreatedAtDisplay = (span, createdAt) => {
    if (createdAt) {
        const date = new Date(parseInt(createdAt));
        span.textContent = `作成日: ${date.toLocaleDateString()}`;
        span.style.display = 'block';
    } else {
        span.textContent = '';
        span.style.display = 'none';
    }
};


const addDragAndDropListeners = (item) => {
    item.addEventListener('dragstart', () => {
        draggedItem = item;
        setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
        setTimeout(() => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
            }
            draggedItem = null;
            // The main script will call saveTasks after this.
        }, 0);
    });
};

export const createTaskElement = (task, app) => {
    const { text, completed, dueDate, recurrence, id, tags, priority, createdAt } = task;
    const listItem = document.createElement('li');
    listItem.setAttribute('draggable', 'true');
    listItem.dataset.id = id;
    if (completed) listItem.classList.add('completed');
    if (dueDate) listItem.dataset.dueDate = dueDate;
    if (recurrence) {
        listItem.dataset.recurrence = JSON.stringify(recurrence);
        listItem.classList.add('is-template');
    }
    if (tags && tags.length > 0) listItem.dataset.tags = JSON.stringify(tags);
    if (priority && priority !== 'none') listItem.dataset.priority = priority;
    listItem.dataset.createdAt = createdAt;

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

    const tagsSpan = document.createElement('span');
    tagsSpan.classList.add('task-tags');
    updateTagsDisplay(tagsSpan, tags);
    taskDetails.appendChild(tagsSpan);

    const prioritySpan = document.createElement('span');
    prioritySpan.classList.add('task-priority');
    updatePriorityDisplay(prioritySpan, priority);
    taskDetails.appendChild(prioritySpan);

    const createdAtSpan = document.createElement('span');
    createdAtSpan.classList.add('created-at');
    updateCreatedAtDisplay(createdAtSpan, createdAt);
    taskDetails.appendChild(createdAtSpan);

    const taskActions = document.createElement('div');
    taskActions.classList.add('task-actions');

    const repeatButton = document.createElement('button');
    repeatButton.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    repeatButton.classList.add('repeat-button');
    repeatButton.setAttribute('aria-label', '繰り返し設定');

    const dateButton = document.createElement('button');
    dateButton.innerHTML = '<i class="fa-solid fa-calendar-days"></i>';
    dateButton.classList.add('date-button');
    dateButton.setAttribute('aria-label', '期日設定');

    const editButton = document.createElement('button');
    editButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    editButton.classList.add('edit-button');
    editButton.setAttribute('aria-label', 'タスクを編集');

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteButton.classList.add('delete-button');
    deleteButton.setAttribute('aria-label', 'タスクを削除');

    // Event Listeners for elements
    addDragAndDropListeners(listItem);
    taskSpan.addEventListener('click', () => app.toggleCompleted(id));
    repeatButton.addEventListener('click', () => app.editRecurrence(id));
    dateButton.addEventListener('click', () => editDueDate(listItem, dueDateSpan, app));
    editButton.addEventListener('click', () => editTask(listItem, taskSpan, app));
    deleteButton.addEventListener('click', () => {
        deleteTaskFromStore(id);
        app.updateApp();
    });

    if (completed) {
        repeatButton.disabled = true;
        dateButton.disabled = true;
        editButton.disabled = true;
    }

    taskActions.appendChild(repeatButton);
    taskActions.appendChild(dateButton);
    taskActions.appendChild(editButton);
    taskActions.appendChild(deleteButton);
    listItem.appendChild(taskDetails);
    listItem.appendChild(taskActions);
    taskList.appendChild(listItem);
    return listItem;
};


const editTask = (listItem, taskSpan, app) => {
    if (listItem.classList.contains('completed') || listItem.classList.contains('editing')) return;
    listItem.classList.add('editing');
    listItem.setAttribute('draggable', 'false');

    const originalText = taskSpan.textContent;
    const task = getTasks().find(t => t.id == listItem.dataset.id);
    const originalTags = task.tags || [];
    const originalPriority = task.priority || 'none';

    taskSpan.style.display = 'none';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = originalText;
    editInput.classList.add('edit-input');

    const editTagInput = document.createElement('input');
    editTagInput.type = 'text';
    editTagInput.value = originalTags.join(', ');
    editTagInput.classList.add('edit-tag-input');
    editTagInput.placeholder = 'タグ (カンマ区切り)';

    const editPrioritySelect = document.createElement('select');
    editPrioritySelect.classList.add('edit-priority-select');
    const priorities = [{value: 'none', text: '優先度なし'}, {value: 'high', text: '高'}, {value: 'medium', text: '中'}, {value: 'low', text: '低'}];
    priorities.forEach(p => {
        const option = document.createElement('option');
        option.value = p.value;
        option.textContent = p.text;
        if (p.value === originalPriority) option.selected = true;
        editPrioritySelect.appendChild(option);
    });

    const finishEditButton = document.createElement('button');
    finishEditButton.textContent = '完了';
    finishEditButton.classList.add('finish-edit-button');

    const taskDetails = listItem.querySelector('.task-details');
    taskDetails.prepend(editInput, editTagInput, editPrioritySelect);
    listItem.querySelector('.task-actions').prepend(finishEditButton);

    editInput.focus();

    const finishEditing = () => {
        const newText = editInput.value.trim();
        const newTags = editTagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const newPriority = editPrioritySelect.value;
        
        task.text = newText || originalText;
        task.tags = newTags;
        task.priority = newPriority;

        updateTask(task);
        
        taskDetails.removeChild(editInput);
        taskDetails.removeChild(editTagInput);
        taskDetails.removeChild(editPrioritySelect);
        listItem.querySelector('.task-actions').removeChild(finishEditButton);
        taskSpan.style.display = '';
        listItem.classList.remove('editing');
        listItem.setAttribute('draggable', 'true');
        
        app.updateApp();
    };

    editInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });
    editTagInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });
    finishEditButton.addEventListener('click', finishEditing);
};

const editDueDate = (listItem, dueDateSpan, app) => {
    if (listItem.classList.contains('completed')) return;
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = listItem.dataset.dueDate || '';
    listItem.querySelector('.task-actions').prepend(dateInput);
    dateInput.focus();

    const finishDateEditing = () => {
        const task = getTasks().find(t => t.id == listItem.dataset.id);
        task.dueDate = dateInput.value;
        updateTask(task);
        updateDueDateDisplay(dueDateSpan, dateInput.value);
        listItem.querySelector('.task-actions').removeChild(dateInput);
        app.updateApp();
    };
    dateInput.addEventListener('blur', finishDateEditing);
    dateInput.addEventListener('change', finishDateEditing);
};


export const updateTaskCount = () => {
    const tasks = getTasks();
    const nonRecurringActiveTasks = tasks.filter(task => !task.completed && !(task.recurrence && task.recurrence.type !== 'none')).length;
    taskCount.textContent = `未完了: ${nonRecurringActiveTasks}件`;
};


export const populateTagFilters = (doc, tasks, filter = 'all', searchTerm = '') => {
    if (!tagFilterSelect) return;

    const filteredTasks = tasks.filter(task => {
        const isCompleted = task.completed;
        const taskText = task.text.toLowerCase();
        const matchesSearch = searchTerm ? taskText.includes(searchTerm) : true;

        let matchesFilter = false;
        if (filter === 'all') matchesFilter = true;
        else if (filter === 'active' && !isCompleted) matchesFilter = !(task.recurrence && task.recurrence.type !== 'none');
        else if (filter === 'completed' && isCompleted) matchesFilter = true;
        else if (filter === 'recurring' && task.recurrence && task.recurrence.type !== 'none') matchesFilter = true;
        
        return matchesFilter && matchesSearch;
    });

    const tags = new Set();
    filteredTasks.forEach(task => {
        if (task.tags) {
            task.tags.forEach(tag => tags.add(tag));
        }
    });

    const currentValue = tagFilterSelect.value;
    tagFilterSelect.innerHTML = '<option value="all">すべて</option>';
    tags.forEach(tag => {
        const option = doc.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilterSelect.appendChild(option);
    });

    if (Array.from(tagFilterSelect.options).some(opt => opt.value === currentValue)) {
        tagFilterSelect.value = currentValue;
    } else {
        tagFilterSelect.value = 'all';
    }
};

export const filterTasks = (currentFilter) => {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedTag = tagFilterSelect.value;
    const selectedPrioritySort = prioritySortSelect.value;

    let tasksToFilter = Array.from(document.querySelectorAll('#task-list li'));

    if (selectedPrioritySort !== 'default') {
        tasksToFilter.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
            const priorityA = priorityOrder[a.dataset.priority || 'none'];
            const priorityB = priorityOrder[b.dataset.priority || 'none'];

            return selectedPrioritySort === 'high-to-low' ? priorityB - priorityA : priorityA - priorityB;
        });
        tasksToFilter.forEach(item => taskList.appendChild(item));
    }

    tasksToFilter.forEach(item => {
        const taskText = item.querySelector('.task-text').textContent.toLowerCase();
        const isCompleted = item.classList.contains('completed');
        const itemTags = item.dataset.tags ? JSON.parse(item.dataset.tags) : [];

        const matchesSearch = taskText.includes(searchTerm);
        const matchesTag = selectedTag === 'all' || itemTags.includes(selectedTag);

        let matchesFilter = false;
        const hasRecurrence = item.dataset.recurrence && JSON.parse(item.dataset.recurrence);
        if (currentFilter === 'all') matchesFilter = true;
        else if (currentFilter === 'active' && !isCompleted && !hasRecurrence) matchesFilter = true;
        else if (currentFilter === 'completed' && isCompleted) matchesFilter = true;
        else if (currentFilter === 'recurring' && hasRecurrence) matchesFilter = true;

        if (matchesFilter && matchesSearch && matchesTag) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });

    if (currentFilter === 'completed') {
        clearCompletedButton.style.display = 'block';
    } else {
        clearCompletedButton.style.display = 'none';
    }
};


export const renderTasks = (app) => {
    const tasks = getTasks();
    taskList.innerHTML = '';
    tasks.forEach(task => createTaskElement(task, app));
};


export const handleDragOver = (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    if (afterElement == null) {
        taskList.appendChild(draggedItem);
    } else {
        taskList.insertBefore(draggedItem, afterElement);
    }
};

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

export const exportTasksToCSV = () => {
    const tasks = getTasks();
    const filter = document.getElementById('export-select').value;

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
    const headers = ['タスク名', '状態', '期日', 'タグ', '優先度', '作成日'];
    csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

    filteredTasks.forEach(task => {
        const status = task.completed ? '完了済み' : '未完了';
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        const taskText = task.text.replace(/"/g, '""');
        const tags = task.tags ? task.tags.join(', ') : '';
        const priority = task.priority || '';
        const createdAt = task.createdAt ? new Date(parseInt(task.createdAt)).toLocaleDateString() : '';

        const row = [`"${taskText}"`, `"${status}"`, `"${dueDate}"`, `"${priority}"`, `"${createdAt}"`];
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

export const loadTheme = () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').checked = true;
    }
};

export const toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};
