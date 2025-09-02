let currentFilter = 'active';
let searchInput;

const getReminderRuleFromUI = (document) => {
    const reminderEnabledCheckbox = document.getElementById('reminder-enabled');
    if (!reminderEnabledCheckbox || !reminderEnabledCheckbox.checked) {
        return null;
    }

    const reminderTypeSelect = document.getElementById('reminder-type-select');
    const type = reminderTypeSelect.value;

    if (type === 'relative') {
        const amount = parseInt(document.getElementById('reminder-amount').value, 10);
        const unit = document.getElementById('reminder-unit').value;
        return { type: 'relative', value: { amount, unit } };
    } else if (type === 'absolute') {
        const datetime = document.getElementById('reminder-datetime').value;
        return { type: 'absolute', value: datetime };
    }
    return null;
};

const calculateReminderAt = (dueDate, rule) => {
    if (!rule) {
        return null;
    }

    if (rule.type === 'absolute') {
        return new Date(rule.value).toISOString();
    }

    // If rule is relative, but no dueDate, then no reminder can be calculated
    if (!dueDate && rule.type === 'relative') {
        return null;
    }

    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) { // Check for Invalid Date
        return null;
    }

    if (rule.type === 'relative') {
        let offset = 0;
        const amount = rule.value.amount;
        const unit = rule.value.unit;

        if (unit === 'minutes') {
            offset = amount * 60 * 1000;
        } else if (unit === 'hours') {
            offset = amount * 60 * 60 * 1000;
        } else if (unit === 'days') {
            offset = amount * 24 * 60 * 60 * 1000;
        }

        return new Date(dueDateObj.getTime() - offset).toISOString();
    }

    return null;
};

const findDueReminders = (tasks) => {
    const now = new Date();
    return tasks.filter(task => {
        return task.reminderAt && !task.reminderNotified && new Date(task.reminderAt) <= now;
    });
};

const populateTagFilters = (doc, tasks, filter = 'all', searchTerm = '') => {
    const tagFilterSelect = doc.getElementById('tag-filter-select');
    if (!tagFilterSelect) return;

    const filteredTasks = tasks.filter(task => {
        const isCompleted = task.completed;
        const taskText = task.text.toLowerCase();

        const matchesSearch = searchTerm ? taskText.includes(searchTerm) : true;

        let matchesFilter = false;
        if (filter === 'all') {
            matchesFilter = true;
        } else if (filter === 'active' && !isCompleted) {
            matchesFilter = !(task.recurrence && task.recurrence.type !== 'none');
        } else if (filter === 'completed' && isCompleted) {
            matchesFilter = true;
        } else if (filter === 'recurring' && task.recurrence && task.recurrence.type !== 'none') {
            matchesFilter = true;
        }
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

const HOLIDAY_API_ERROR_MESSAGE = '祝日APIの取得に失敗しました。オフラインの場合、祝日でもタスクが生成される可能性があります。';

const saveHolidaysToCache = (holidays) => {
    const cacheData = {
        timestamp: new Date().toISOString(),
        holidays: holidays,
    };
    localStorage.setItem('holidayCache', JSON.stringify(cacheData));
};

const loadHolidaysFromCache = () => {
    const cacheString = localStorage.getItem('holidayCache');
    if (!cacheString) return null;

    try {
        const cacheData = JSON.parse(cacheString);
        return cacheData.holidays;
    } catch (error) {
        console.error('Error parsing holiday cache:', error);
        return null;
    }
};

const getHolidays = async () => {
    const cachedHolidays = loadHolidaysFromCache();
    if (cachedHolidays) {
        return cachedHolidays;
    }

    try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (response.ok) {
            const holidays = await response.json();
            saveHolidaysToCache(holidays);
            return holidays;
        } else {
            alert(HOLIDAY_API_ERROR_MESSAGE);
            return null;
        }
    } catch (error) {
        alert(HOLIDAY_API_ERROR_MESSAGE);
        return null;
    }
};

const generateRecurringTasks = async () => {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newTasksGenerated = false;

    const holidays = await getHolidays() || {};

    const templates = tasks.filter(t => t.recurrence && t.recurrence.type !== 'none');

    for (const template of templates) {
        let lastGenerated = template.recurrence.lastGenerated ? new Date(template.recurrence.lastGenerated) : new Date(parseInt(template.id));
        lastGenerated.setHours(0, 0, 0, 0);

        let nextDueDate = new Date(lastGenerated);

        while (nextDueDate < today) {
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
                    nextDueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, template.recurrence.day);
                    break;
            }

            if (nextDueDate <= today) {
                const yyyy = nextDueDate.getFullYear();
                const mm = String(nextDueDate.getMonth() + 1).padStart(2, '0');
                const dd = String(nextDueDate.getDate()).padStart(2, '0');
                const dueDateString = `${yyyy}-${mm}-${dd}`;

                const dayOfWeek = nextDueDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = holidays[dueDateString];

                if (!isWeekend && !isHoliday) {
                    const taskExists = tasks.some(t => t.templateId === template.id && t.dueDate === dueDateString);

                    if (!taskExists) {
                        const newTask = {
                            id: Date.now() + Math.random(),
                            templateId: template.id,
                            text: template.text,
                            completed: false,
                            dueDate: dueDateString,
                            recurrence: null,
                            tags: template.tags || [],
                            priority: template.priority || 'none',
                            createdAt: Date.now()
                        };
                        tasks.push(newTask);
                        newTasksGenerated = true;
                    }
                }
            }
        }
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        template.recurrence.lastGenerated = `${yyyy}-${mm}-${dd}`;
    }

    if (newTasksGenerated) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
};

// All functions are moved to the top level to allow for testing and exporting.
// Global variables that need to be accessed by multiple functions.
let draggedItem = null;
let currentEditingListItem = null;
let currentEditingListItemForReminder = null;


const checkNotificationPermission = () => {
    const notificationPermissionAlert = document.getElementById('notification-permission-alert');
    const reminderEnabledCheckbox = document.getElementById('reminder-enabled');

    if (!('Notification' in window)) {
        notificationPermissionAlert.textContent = 'お使いのブラウザは通知機能をサポートしていません。';
        notificationPermissionAlert.classList.remove('hidden');
        if(reminderEnabledCheckbox) reminderEnabledCheckbox.disabled = true;
        return;
    }

    if (Notification.permission === 'denied') {
        notificationPermissionAlert.textContent = 'ブラウザの通知がブロックされています。リマインダー機能を使用するには、設定から通知を許可してください。';
        notificationPermissionAlert.classList.remove('hidden');
        if(reminderEnabledCheckbox) reminderEnabledCheckbox.disabled = true;
    } else {
        notificationPermissionAlert.classList.add('hidden');
        if(reminderEnabledCheckbox) reminderEnabledCheckbox.disabled = false;
    }
};

const updateApp = () => {
    saveTasks(document);
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    updateTaskCount(document);
    populateTagFilters(document, tasks, currentFilter, searchInput.value.toLowerCase());
    filterTasks(document);
    const completedTasksExist = tasks.some(task => task.completed);
    const clearCompletedButton = document.getElementById('clear-completed-button');
    if (completedTasksExist) {
        clearCompletedButton.style.display = 'block';
    } else {
        clearCompletedButton.style.display = 'none';
    }
};

const loadApp = () => {
    loadTheme();
    loadTasks();
};

const loadTasks = async () => {
    await generateRecurringTasks();
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    tasks.forEach(task => createTaskElement(document, task));
    updateApp();
};

const saveTasks = (doc) => {
    const tasks = [];
    doc.querySelectorAll('#task-list li').forEach(listItem => {
        tasks.push({
            id: listItem.dataset.id,
            text: listItem.querySelector('.task-text').textContent,
            completed: listItem.classList.contains('completed'),
            dueDate: listItem.dataset.dueDate || null,
            recurrence: listItem.dataset.recurrence ? JSON.parse(listItem.dataset.recurrence) : null,
            tags: listItem.dataset.tags ? JSON.parse(listItem.dataset.tags) : [],
            priority: listItem.dataset.priority || 'none',
            createdAt: listItem.dataset.createdAt || null,
            reminderRule: listItem.dataset.reminderRule ? JSON.parse(listItem.dataset.reminderRule) : null,
            reminderAt: listItem.dataset.reminderAt || null
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
};
const createTaskObject = (text, completed, dueDate, recurrence, id, tags, priority, createdAt, reminderRule, reminderAt) => ({
    text, completed, dueDate, recurrence, id, tags, priority, createdAt, reminderRule, reminderAt
});

const createTaskElement = (doc, task) => {
    const { text, completed, dueDate, recurrence, id, tags, priority, createdAt, reminderRule, reminderAt } = task;
    const listItem = doc.createElement('li');
    listItem.setAttribute('draggable', 'true');
    listItem.dataset.id = id || Date.now();
    if (completed) listItem.classList.add('completed');
    if (dueDate) listItem.dataset.dueDate = dueDate;
    if (recurrence) {
        listItem.dataset.recurrence = JSON.stringify(recurrence);
        listItem.classList.add('is-template');
    }
    if (tags && tags.length > 0) listItem.dataset.tags = JSON.stringify(tags);
    if (priority && priority !== 'none') listItem.dataset.priority = priority;
    listItem.dataset.createdAt = createdAt;
    if (reminderRule) listItem.dataset.reminderRule = JSON.stringify(reminderRule);
    if (reminderAt) listItem.dataset.reminderAt = reminderAt;

    const taskDetails = doc.createElement('div');
    taskDetails.classList.add('task-details');

    const taskSpan = doc.createElement('span');
    taskSpan.textContent = text;
    taskSpan.classList.add('task-text');

    if (recurrence) {
        const templateIcon = doc.createElement('i');
        templateIcon.classList.add('fa-solid', 'fa-clone', 'template-icon');
        taskSpan.prepend(templateIcon);
    }

    const dueDateSpan = doc.createElement('span');
    dueDateSpan.classList.add('due-date');
    updateDueDateDisplay(dueDateSpan, dueDate);

    const recurrenceSpan = doc.createElement('span');
    recurrenceSpan.classList.add('recurrence-status');
    updateRecurrenceDisplay(recurrenceSpan, recurrence);


    taskDetails.appendChild(taskSpan);
    taskDetails.appendChild(dueDateSpan);
    taskDetails.appendChild(recurrenceSpan);

    const tagsSpan = doc.createElement('span');
    tagsSpan.classList.add('task-tags');
    updateTagsDisplay(tagsSpan, tags);
    taskDetails.appendChild(tagsSpan);

    const prioritySpan = doc.createElement('span');
    prioritySpan.classList.add('task-priority');
    updatePriorityDisplay(prioritySpan, priority);
    taskDetails.appendChild(prioritySpan);

    const createdAtSpan = doc.createElement('span');
    createdAtSpan.classList.add('created-at');
    updateCreatedAtDisplay(createdAtSpan, createdAt);
    taskDetails.appendChild(createdAtSpan);

    const taskActions = doc.createElement('div');
    taskActions.classList.add('task-actions');

    const repeatButton = doc.createElement('button');
    repeatButton.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    repeatButton.classList.add('repeat-button');
    repeatButton.setAttribute('aria-label', '繰り返し設定');

    const dateButton = doc.createElement('button');
    dateButton.innerHTML = '<i class="fa-solid fa-calendar-days"></i>';
    dateButton.classList.add('date-button');
    dateButton.setAttribute('aria-label', '期日設定');

    const reminderButton = doc.createElement('button');
    reminderButton.innerHTML = '<i class="fa-solid fa-bell"></i>';
    reminderButton.classList.add('reminder-button');
    reminderButton.setAttribute('aria-label', 'リマインダー設定');

    const editButton = doc.createElement('button');
    editButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    editButton.classList.add('edit-button');
    editButton.setAttribute('aria-label', 'タスクを編集');

    const deleteButton = doc.createElement('button');
    deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteButton.classList.add('delete-button');
    deleteButton.setAttribute('aria-label', 'タスクを削除');

    addDragAndDropListeners(listItem);
    taskSpan.addEventListener('click', () => toggleCompleted(listItem));
    repeatButton.addEventListener('click', () => editRecurrence(listItem));
    dateButton.addEventListener('click', () => editDueDate(listItem, dueDateSpan));
    reminderButton.addEventListener('click', () => openReminderModal(listItem));
    editButton.addEventListener('click', () => editTask(listItem, taskSpan));
    deleteButton.addEventListener('click', () => deleteTask(listItem));

    if (completed) {
        repeatButton.disabled = true;
        dateButton.disabled = true;
        editButton.disabled = true;
        reminderButton.disabled = true;
    }

    taskActions.appendChild(repeatButton);
    taskActions.appendChild(dateButton);
    taskActions.appendChild(reminderButton);
    taskActions.appendChild(editButton);
    taskActions.appendChild(deleteButton);
    listItem.appendChild(taskDetails);
    listItem.appendChild(taskActions);

    const taskList = doc.getElementById('task-list');
    taskList.appendChild(listItem);
};

const addTask = () => {
    const taskInput = document.getElementById('task-input');
    const tagInput = document.getElementById('tag-input');
    const prioritySelect = document.getElementById('priority-select');

    const taskText = taskInput.value.trim();
    const tags = tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    const priority = prioritySelect.value;
    const reminderRule = getReminderRuleFromUI(document);
    const dueDate = null;
    const reminderAt = calculateReminderAt(dueDate, reminderRule);


    if (taskText === '') { alert('タスクを入力してください。'); return; }
    const newTask = createTaskObject(
        taskText, false, dueDate, null, Date.now(), tags, priority,
        Date.now(), reminderRule, reminderAt
    );
    createTaskElement(document, newTask);
    updateApp();
    taskInput.value = '';
    tagInput.value = '';
    prioritySelect.value = 'none';
};

const toggleCompleted = (listItem) => {
    if (listItem.classList.contains('editing') || listItem.classList.contains('is-template')) return;
    listItem.classList.toggle('completed');

    const repeatButton = listItem.querySelector('.repeat-button');
    const dateButton = listItem.querySelector('.date-button');
    const editButton = listItem.querySelector('.edit-button');

    if (listItem.classList.contains('completed')) {
        repeatButton.disabled = true;
        dateButton.disabled = true;
        editButton.disabled = true;
    } else {
        repeatButton.disabled = false;
        dateButton.disabled = false;
        editButton.disabled = false;
    }

    updateApp();
};

const deleteTask = (listItem) => {
    const taskList = document.getElementById('task-list');
    taskList.removeChild(listItem);
    updateApp();
};

const editTask = (listItem, taskSpan) => {
    if (listItem.classList.contains('completed') || listItem.classList.contains('editing')) return;
    listItem.classList.add('editing');
    listItem.setAttribute('draggable', 'false');
    const originalText = taskSpan.textContent;
    const originalTags = listItem.dataset.tags ? JSON.parse(listItem.dataset.tags) : [];
    const originalPriority = listItem.dataset.priority || 'none';

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
    taskDetails.prepend(editPrioritySelect, editTagInput, editInput);
    listItem.querySelector('.task-actions').prepend(finishEditButton);

    editInput.focus();

    const finishEditing = () => {
        const newText = editInput.value.trim();
        const newTags = editTagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const newPriority = editPrioritySelect.value;

        taskSpan.textContent = newText || originalText;
        listItem.dataset.tags = JSON.stringify(newTags);
        listItem.dataset.priority = newPriority;

        taskDetails.removeChild(editInput);
        taskDetails.removeChild(editTagInput);
        taskDetails.removeChild(editPrioritySelect);
        listItem.querySelector('.task-actions').removeChild(finishEditButton);
        taskSpan.style.display = '';

        const existingIcon = listItem.querySelector('.template-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        if (listItem.dataset.recurrence && JSON.parse(listItem.dataset.recurrence)) {
            listItem.classList.add('is-template');
            const templateIcon = document.createElement('i');
            templateIcon.classList.add('fa-solid', 'fa-clone', 'template-icon');
            taskSpan.prepend(templateIcon);
        } else {
            listItem.classList.remove('is-template');
        }

        updateTagsDisplay(listItem.querySelector('.task-tags'), newTags);
        updatePriorityDisplay(listItem.querySelector('.task-priority'), newPriority);

        listItem.classList.remove('editing');
        listItem.setAttribute('draggable', 'true');
        updateApp();
    };
    editInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });
    editTagInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });

    finishEditButton.addEventListener('click', finishEditing);
};

const editDueDate = (listItem, dueDateSpan) => {
    if (listItem.classList.contains('completed')) return;
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = listItem.dataset.dueDate || '';
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

const openRecurrenceModal = (listItem) => {
    currentEditingListItem = listItem;
    const recurrence = JSON.parse(listItem.dataset.recurrence || 'null');
    const recurrenceModal = document.getElementById('recurrence-modal');
    const recurrenceType = document.getElementById('recurrence-type');
    const weekdaySelector = document.querySelector('.weekday-selector');
    const monthlyDayInput = document.getElementById('monthly-day');

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
    const recurrenceModal = document.getElementById('recurrence-modal');
    recurrenceModal.style.display = 'none';
    currentEditingListItem = null;
};

const saveRecurrence = () => {
    if (!currentEditingListItem) return;
    const recurrenceType = document.getElementById('recurrence-type');
    const weekdaySelector = document.querySelector('.weekday-selector');
    const monthlyDayInput = document.getElementById('monthly-day');

    const type = recurrenceType.value;
    let recurrence = null;

    if (type !== 'none') {
        recurrence = { type: type };
        if (type === 'weekly') {
            const selectedDays = [];
            weekdaySelector.querySelectorAll('span.selected').forEach((span, index) => {
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
    const recurrenceType = document.getElementById('recurrence-type');
    const weeklyOptions = document.getElementById('weekly-options');
    const monthlyOptions = document.getElementById('monthly-options');
    weeklyOptions.style.display = recurrenceType.value === 'weekly' ? 'block' : 'none';
    monthlyOptions.style.display = recurrenceType.value === 'monthly' ? 'block' : 'none';
};

const editRecurrence = (listItem) => {
    if (listItem.classList.contains('completed')) return;
    openRecurrenceModal(listItem);
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

const updateTaskCount = (doc) => {
    const taskList = doc.getElementById('task-list');
    const taskCount = doc.getElementById('task-count');
    const nonRecurringActiveTasks = Array.from(taskList.querySelectorAll('li:not(.completed)')).filter(item => {
        return !(item.dataset.recurrence && JSON.parse(item.dataset.recurrence));
    }).length;
    taskCount.textContent = `未完了: ${nonRecurringActiveTasks}件`;
};

const filterTasks = (doc) => {
    const searchInput = doc.getElementById('search-input');
    const tagFilterSelect = doc.getElementById('tag-filter-select');
    const prioritySortSelect = doc.getElementById('priority-sort-select');
    const taskList = doc.getElementById('task-list');

    const searchTerm = searchInput.value.toLowerCase();
    const selectedTag = tagFilterSelect.value;
    const selectedPrioritySort = prioritySortSelect.value;

    let tasksToFilter = Array.from(taskList.querySelectorAll('li'));

    if (selectedPrioritySort !== 'default') {
        tasksToFilter.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
            const priorityA = priorityOrder[a.dataset.priority || 'none'];
            const priorityB = priorityOrder[b.dataset.priority || 'none'];

            if (selectedPrioritySort === 'high-to-low') {
                return priorityB - priorityA;
            } else {
                return priorityA - priorityB;
            }
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
        if (currentFilter === 'all') {
            matchesFilter = true;
        } else if (currentFilter === 'active' && !isCompleted) {
            matchesFilter = !(item.dataset.recurrence && JSON.parse(item.dataset.recurrence));
        } else if (currentFilter === 'completed' && isCompleted) {
            matchesFilter = true;
        } else if (currentFilter === 'recurring' && item.dataset.recurrence && JSON.parse(item.dataset.recurrence)) {
            matchesFilter = true;
        }

        if (matchesFilter && matchesSearch && matchesTag) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
};

const addDragAndDropListeners = (item) => {
    item.addEventListener('dragstart', () => {
        draggedItem = item;
        setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
        setTimeout(() => {
            if(draggedItem) {
                draggedItem.classList.remove('dragging');
            }
            draggedItem = null;
            saveTasks(document);
        }, 0);
    });
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

const exportTasksToCSV = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const exportSelect = document.getElementById('export-select');
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
    const headers = ['タスク名', '状態', '期日', 'タグ', '優先度', '作成日'];
    csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

    filteredTasks.forEach(task => {
        const status = task.completed ? '完了済み' : '未完了';
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        const taskText = task.text.replace(/"/g, '""');
        const tags = task.tags ? task.tags.join(', ') : '';
        const priority = task.priority || '';
        const createdAt = task.createdAt ? new Date(parseInt(task.createdAt)).toLocaleDateString() : '';

        const row = [`"${taskText}"`, `"${status}"`, `"${dueDate}"`, `"${tags}"`, `"${priority}"`, `"${createdAt}"`];
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

const loadTheme = () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
};

const toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

const openReminderModal = (listItem) => {
    currentEditingListItemForReminder = listItem;
    const reminderRule = JSON.parse(listItem.dataset.reminderRule || 'null');
    const dueDate = listItem.dataset.dueDate;
    const reminderModal = document.getElementById('reminder-modal');
    const modalReminderEnabled = document.getElementById('modal-reminder-enabled');
    const modalReminderOptions = document.getElementById('modal-reminder-options');
    const modalReminderTypeSelect = document.getElementById('modal-reminder-type-select');
    const modalReminderAmount = document.getElementById('modal-reminder-amount');
    const modalReminderUnit = document.getElementById('modal-reminder-unit');
    const modalReminderDatetime = document.getElementById('modal-reminder-datetime');

    modalReminderEnabled.checked = false;
    modalReminderOptions.classList.add('hidden');
    modalReminderTypeSelect.value = 'relative';
    document.getElementById('modal-reminder-value-relative').classList.remove('hidden');
    document.getElementById('modal-reminder-value-absolute').classList.add('hidden');
    modalReminderAmount.value = '30';
    modalReminderUnit.value = 'minutes';
    modalReminderDatetime.value = '';

    if (reminderRule) {
        modalReminderEnabled.checked = true;
        modalReminderOptions.classList.remove('hidden');
        modalReminderTypeSelect.value = reminderRule.type;

        if (reminderRule.type === 'relative') {
            modalReminderAmount.value = reminderRule.value.amount;
            modalReminderUnit.value = reminderRule.value.unit;
        } else if (reminderRule.type === 'absolute') {
            document.getElementById('modal-reminder-value-relative').classList.add('hidden');
            document.getElementById('modal-reminder-value-absolute').classList.remove('hidden');
            if (reminderRule.value) {
                const d = new Date(reminderRule.value);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                modalReminderDatetime.value = d.toISOString().slice(0, 16);
            }
        }
    }

    updateReminderWarning(dueDate);
    reminderModal.style.display = 'block';
};

const closeReminderModal = () => {
    const reminderModal = document.getElementById('reminder-modal');
    reminderModal.style.display = 'none';
    currentEditingListItemForReminder = null;
};

const saveReminder = () => {
    if (!currentEditingListItemForReminder) return;
    const modalReminderEnabled = document.getElementById('modal-reminder-enabled');
    const modalReminderTypeSelect = document.getElementById('modal-reminder-type-select');
    const modalReminderAmount = document.getElementById('modal-reminder-amount');
    const modalReminderUnit = document.getElementById('modal-reminder-unit');
    const modalReminderDatetime = document.getElementById('modal-reminder-datetime');

    let newReminderRule = null;
    if (modalReminderEnabled.checked) {
        const type = modalReminderTypeSelect.value;
        if (type === 'relative') {
            const amount = parseInt(modalReminderAmount.value, 10);
            const unit = modalReminderUnit.value;
            if (!isNaN(amount) && unit) {
                newReminderRule = { type: 'relative', value: { amount, unit } };
            }
        } else if (type === 'absolute') {
            const datetime = modalReminderDatetime.value;
            if (datetime) {
                newReminderRule = { type: 'absolute', value: new Date(datetime).toISOString() };
            }
        }
    }

    const dueDate = currentEditingListItemForReminder.dataset.dueDate || null;
    const newReminderAt = calculateReminderAt(dueDate, newReminderRule);

    currentEditingListItemForReminder.dataset.reminderRule = newReminderRule ? JSON.stringify(newReminderRule) : '';
    currentEditingListItemForReminder.dataset.reminderAt = newReminderAt || '';
    
    updateApp();
    closeReminderModal();
};

const updateReminderWarning = (dueDate) => {
    const modalReminderTypeSelect = document.getElementById('modal-reminder-type-select');
    const modalReminderWarning = document.getElementById('modal-reminder-warning');
    const saveReminderButton = document.getElementById('save-reminder-button');
    const isRelative = modalReminderTypeSelect.value === 'relative';
    if (isRelative && !dueDate) {
        modalReminderWarning.classList.remove('hidden');
        saveReminderButton.disabled = true;
    } else {
        modalReminderWarning.classList.add('hidden');
        saveReminderButton.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Get all elements
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.querySelector('#task-list');
    const filterSelect = document.getElementById('filter-select');
    const clearCompletedButton = document.getElementById('clear-completed-button');
    const themeToggle = document.getElementById('theme-toggle');
    searchInput = document.getElementById('search-input');
    const exportButton = document.getElementById('export-button');
    const tagFilterSelect = document.getElementById('tag-filter-select');
    const prioritySortSelect = document.getElementById('priority-sort-select');
    const reminderEnabledCheckbox = document.getElementById('reminder-enabled');
    const reminderTypeSelect = document.getElementById('reminder-type-select');
    const reminderModal = document.getElementById('reminder-modal');
    const reminderModalCloseButton = reminderModal.querySelector('.close-button');
    const cancelReminderButton = document.getElementById('cancel-reminder-button');
    const saveReminderButton = document.getElementById('save-reminder-button');
    const modalReminderEnabled = document.getElementById('modal-reminder-enabled');
    const modalReminderTypeSelect = document.getElementById('modal-reminder-type-select');
    const recurrenceModal = document.getElementById('recurrence-modal');
    const recurrenceModalCloseButton = recurrenceModal.querySelector('.close-button');
    const cancelRecurrenceButton = document.getElementById('cancel-recurrence-button');
    const saveRecurrenceButton = document.getElementById('save-recurrence-button');
    const recurrenceType = document.getElementById('recurrence-type');
    const weekdaySelector = document.querySelector('.weekday-selector');

    // Initial setup
    checkNotificationPermission();

    // Leader election for reminder scheduling
    const tabId = `tab_${Date.now()}_${Math.random()}`;
    let isLeader = false;
    let reminderInterval;
    let leaderCheckInterval;
    const LEADER_CHECK_INTERVAL = 5000;
    const LEADER_TIMEOUT = 10000;

    function startReminderChecks() {
        if (reminderInterval) clearInterval(reminderInterval);
        reminderInterval = setInterval(() => {
            const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            const dueTasks = findDueReminders(tasks);
            dueTasks.forEach(task => {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'REMINDER', task });
                }
            });
        }, 60 * 1000);
    }

    function becomeLeader() {
        isLeader = true;
        localStorage.setItem('leaderTabId', tabId);
        localStorage.setItem('lastLeaderCheckin', Date.now());
        if (leaderCheckInterval) clearInterval(leaderCheckInterval);
        leaderCheckInterval = setInterval(() => {
            localStorage.setItem('lastLeaderCheckin', Date.now());
        }, LEADER_CHECK_INTERVAL);
        startReminderChecks();
    }

    function attemptToBecomeLeader() {
        const currentLeader = localStorage.getItem('leaderTabId');
        const lastCheckin = parseInt(localStorage.getItem('lastLeaderCheckin') || '0', 10);
        if (!currentLeader || (Date.now() - lastCheckin > LEADER_TIMEOUT) || currentLeader === tabId) {
            becomeLeader();
        } else {
            isLeader = false;
        }
    }

    setInterval(attemptToBecomeLeader, LEADER_CHECK_INTERVAL * 2);
    attemptToBecomeLeader();

    window.addEventListener('beforeunload', () => {
        if (isLeader) {
            localStorage.removeItem('leaderTabId');
            localStorage.removeItem('lastLeaderCheckin');
        }
    });

    // Service Worker message listener
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'REMINDER_ACK') {
                const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
                const task = tasks.find(t => t.id == event.data.taskId);
                if (task) {
                    task.reminderNotified = true;
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                }
            } else if (event.data && event.data.type === 'REMINDER_FAILED') {
                console.error(`Service worker failed to show notification for task ID: ${event.data.taskId}`, event.data.error);
            }
        });
    }

    // Add all event listeners
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
    filterSelect.addEventListener('change', e => { currentFilter = e.target.value; updateApp(); });
    clearCompletedButton.addEventListener('click', () => {
        document.querySelectorAll('#task-list li.completed').forEach(deleteTask);
    });
    themeToggle.addEventListener('change', toggleTheme);
    searchInput.addEventListener('input', updateApp);
    exportButton.addEventListener('click', exportTasksToCSV);
    tagFilterSelect.addEventListener('change', () => {
        tagFilterSelect.dataset.currentValue = tagFilterSelect.value;
        updateApp();
    });
    prioritySortSelect.addEventListener('change', updateApp);
    window.addEventListener('focus', checkNotificationPermission);

    // Main reminder form listeners
    if (reminderEnabledCheckbox) {
        reminderEnabledCheckbox.addEventListener('change', () => {
            document.getElementById('reminder-options').classList.toggle('hidden', !reminderEnabledCheckbox.checked);
            if (reminderEnabledCheckbox.checked && Notification.permission === 'default') {
                Notification.requestPermission().then(checkNotificationPermission);
            }
        });
    }
    if (reminderTypeSelect) {
        reminderTypeSelect.addEventListener('change', () => {
            const isRelative = reminderTypeSelect.value === 'relative';
            document.getElementById('reminder-value-relative').classList.toggle('hidden', !isRelative);
            document.getElementById('reminder-value-absolute').classList.toggle('hidden', isRelative);
        });
    }

    // Reminder Modal Listeners
    modalReminderEnabled.addEventListener('change', () => {
        document.getElementById('modal-reminder-options').classList.toggle('hidden', !modalReminderEnabled.checked);
    });
    modalReminderTypeSelect.addEventListener('change', () => {
        const isRelative = modalReminderTypeSelect.value === 'relative';
        document.getElementById('modal-reminder-value-relative').classList.toggle('hidden', !isRelative);
        document.getElementById('modal-reminder-value-absolute').classList.toggle('hidden', isRelative);
        if(currentEditingListItemForReminder) updateReminderWarning(currentEditingListItemForReminder.dataset.dueDate);
    });
    reminderModalCloseButton.addEventListener('click', closeReminderModal);
    cancelReminderButton.addEventListener('click', closeReminderModal);
    saveReminderButton.addEventListener('click', saveReminder);

    // Recurrence Modal Listeners
    recurrenceModalCloseButton.addEventListener('click', closeRecurrenceModal);
    cancelRecurrenceButton.addEventListener('click', closeRecurrenceModal);
    saveRecurrenceButton.addEventListener('click', saveRecurrence);
    recurrenceType.addEventListener('change', toggleRecurrenceDetails);
    weekdaySelector.addEventListener('click', e => {
        if (e.target.tagName === 'SPAN') {
            e.target.classList.toggle('selected');
        }
    });
    window.addEventListener('click', e => {
        if (e.target == recurrenceModal) closeRecurrenceModal();
        if (e.target == reminderModal) closeReminderModal();
    });

    // Load initial state
    filterSelect.value = currentFilter;
    loadApp();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReminderRuleFromUI,
        calculateReminderAt,
        findDueReminders,
        populateTagFilters,
        getHolidays,
        generateRecurringTasks,
        createTaskObject,
        createTaskElement,
        saveTasks
    };
}