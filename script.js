document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const filterSelect = document.getElementById('filter-select');
    const clearCompletedButton = document.getElementById('clear-completed-button');
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const exportSelect = document.getElementById('export-select');
    const exportButton = document.getElementById('export-button');
    const tagInput = document.getElementById('tag-input');
    const prioritySelect = document.getElementById('priority-select');
    const tagFilterSelect = document.getElementById('tag-filter-select');
    const prioritySortSelect = document.getElementById('priority-sort-select');

    let currentFilter = 'active';
    let draggedItem = null;

    // --- Core Functions ---
    const updateApp = () => {
        saveTasks();
        updateTaskCount();
        populateTagFilters(); // タグフィルタを更新
        filterTasks();
        // 「完了タスクを一括削除」ボタンの表示制御
        if (currentFilter === 'completed') {
            clearCompletedButton.style.display = 'block';
        } else {
            clearCompletedButton.style.display = 'none';
        }
    };

    const loadApp = () => {
        loadTheme();
        loadTasks();
    };

    // --- Task Management ---
    const loadTasks = async () => { // asyncキーワードを追加
        await generateRecurringTasks(); // await を使って完了を待つ
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        taskList.innerHTML = '';
        tasks.forEach(task => createTaskElement(task.text, task.completed, task.dueDate, task.recurrence, task.id, task.tags, task.priority, task.createdAt));
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
                recurrence: listItem.dataset.recurrence ? JSON.parse(listItem.dataset.recurrence) : null,
                tags: listItem.dataset.tags ? JSON.parse(listItem.dataset.tags) : [], // tagsを追加
                priority: listItem.dataset.priority || 'none', // priorityを追加
                createdAt: listItem.dataset.createdAt || null // createdAtを追加
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    const createTaskElement = (text, completed, dueDate, recurrence, id, tags = [], priority = 'none', createdAt = Date.now()) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('draggable', 'true');
        listItem.dataset.id = id || Date.now(); // Assign new ID if none exists
        if (completed) listItem.classList.add('completed');
        if (dueDate) listItem.dataset.dueDate = dueDate;
        if (recurrence) {
            listItem.dataset.recurrence = JSON.stringify(recurrence);
            listItem.classList.add('is-template'); // Add class for templates
        }
        if (tags.length > 0) listItem.dataset.tags = JSON.stringify(tags); // tagsをdatasetに保存
        if (priority !== 'none') listItem.dataset.priority = priority; // priorityをdatasetに保存
        listItem.dataset.createdAt = createdAt; // createdAtをdatasetに保存

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
        updateTagsDisplay(tagsSpan, tags); // タグ表示を更新
        taskDetails.appendChild(tagsSpan);

        const prioritySpan = document.createElement('span');
        prioritySpan.classList.add('task-priority');
        updatePriorityDisplay(prioritySpan, priority); // 優先度表示を更新
        taskDetails.appendChild(prioritySpan);

        const createdAtSpan = document.createElement('span');
        createdAtSpan.classList.add('created-at');
        updateCreatedAtDisplay(createdAtSpan, createdAt); // 作成日表示を更新
        taskDetails.appendChild(createdAtSpan);

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
    };

    const addTask = () => {
        const taskText = taskInput.value.trim();
        const tags = tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== ''); // タグを配列として取得
        const priority = prioritySelect.value; // 優先度を取得

        if (taskText === '') { alert('タスクを入力してください。'); return; }
        createTaskElement(taskText, false, null, null, null, tags, priority, Date.now()); // tags, priority, createdAtを渡す
        updateApp();
        taskInput.value = '';
        tagInput.value = ''; // タグ入力欄をクリア
        prioritySelect.value = 'none'; // 優先度をリセット
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
        taskList.removeChild(listItem);
        updateApp();
    };

    const editTask = (listItem, taskSpan) => {
        if (listItem.classList.contains('completed')) return;
        if (listItem.classList.contains('editing')) return;
        listItem.classList.add('editing');
        // 編集モード中はドラッグを無効にする
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

        // 完了ボタンを追加
        const finishEditButton = document.createElement('button');
        finishEditButton.textContent = '完了';
        finishEditButton.classList.add('finish-edit-button');

        const taskDetails = listItem.querySelector('.task-details');
        taskDetails.prepend(editInput, editTagInput, editPrioritySelect); // 複数の要素をまとめて追加
        // 完了ボタンをタスクアクションズに追加
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
            // 完了ボタンも削除
            listItem.querySelector('.task-actions').removeChild(finishEditButton);
            taskSpan.style.display = '';

            // Recurrence icon handling
            const existingIcon = listItem.querySelector('.template-icon');
            if (existingIcon) {
                existingIcon.remove(); // 既存のアイコンを削除して重複を防ぐ
            }
            // listItem.dataset.recurrence が存在し、かつその内容が有効な繰り返し設定である場合
            if (listItem.dataset.recurrence && JSON.parse(listItem.dataset.recurrence)) {
                listItem.classList.add('is-template');
                const templateIcon = document.createElement('i');
                templateIcon.classList.add('fa-solid', 'fa-clone', 'template-icon');
                taskSpan.prepend(templateIcon);
            } else {
                listItem.classList.remove('is-template');
            }

            // タグと優先度の表示を更新
            updateTagsDisplay(listItem.querySelector('.task-tags'), newTags);
            updatePriorityDisplay(listItem.querySelector('.task-priority'), newPriority);

            listItem.classList.remove('editing');
            // 編集完了後にドラッグを有効に戻す
            listItem.setAttribute('draggable', 'true');
            updateApp();
        };
        // Enterキーでの完了はそのまま
        editInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });
        editTagInput.addEventListener('keypress', e => { if (e.key === 'Enter') finishEditing(); });
        
        // 完了ボタンのクリックイベント
        finishEditButton.addEventListener('click', finishEditing);
    };

    const editDueDate = (listItem, dueDateSpan) => {
        if (listItem.classList.contains('completed')) return;
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
        if (listItem.classList.contains('completed')) return;
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

    // --- Helper Functions for Display ---
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
        // 既存の優先度クラスをすべて削除
        span.classList.remove('priority-high', 'priority-medium', 'priority-low');

        if (priority && priority !== 'none') {
            let displayPriority = '';
            switch (priority) {
                case 'high': displayPriority = '高'; break;
                case 'medium': displayPriority = '中'; break;
                case 'low': displayPriority = '低'; break;
            }
            span.textContent = `優先度: ${displayPriority}`;
            span.classList.add(`priority-${priority}`); // スタイル適用のためクラスを追加
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

    const generateRecurringTasks = async () => { // asyncキーワードを追加
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newTasksGenerated = false;

        // --- 祝日APIからデータを取得 ---
        let holidays = {};
        try {
            const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
            if (response.ok) {
                holidays = await response.json();
            } else {
                console.error('祝日APIの取得に失敗しました。');
            }
        } catch (error) {
            console.error('祝日APIへの接続中にエラーが発生しました:', error);
        }
        // ------------------------------

        const templates = tasks.filter(t => t.recurrence && t.recurrence.type !== 'none');

        for (const template of templates) { // for...of ループに変更して非同期処理に対応
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
                        nextDueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, template.recurrence.day);
                        break;
                }

                if (nextDueDate <= today) {
                    const yyyy = nextDueDate.getFullYear();
                    const mm = String(nextDueDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(nextDueDate.getDate()).padStart(2, '0');
                    const dueDateString = `${yyyy}-${mm}-${dd}`;

                    // --- 土日・祝日チェック ---
                    const dayOfWeek = nextDueDate.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isHoliday = holidays[dueDateString];

                    if (!isWeekend && !isHoliday) { // 平日のみタスクを生成
                        const taskExists = tasks.some(t => t.templateId === template.id && t.dueDate === dueDateString);

                        if (!taskExists) {
                            const newTask = {
                                id: Date.now() + Math.random(),
                                templateId: template.id,
                                text: template.text,
                                completed: false,
                                dueDate: dueDateString,
                                recurrence: null,
                                tags: template.tags || [], // タグを継承
                                priority: template.priority || 'none', // 優先度を継承
                                createdAt: Date.now()
                            };
                            tasks.push(newTask);
                            newTasksGenerated = true;
                        }
                    }
                    // --------------------------
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

    const populateTagFilters = () => {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const allTags = new Set();
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => allTags.add(tag));
            }
        });

        tagFilterSelect.innerHTML = '<option value="all">すべて</option>'; // デフォルトオプションを保持
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilterSelect.appendChild(option);
        });
        // 現在選択されているタグを保持
        if (tagFilterSelect.dataset.currentValue) {
            tagFilterSelect.value = tagFilterSelect.dataset.currentValue;
        }
    };

    // --- UI & Filters ---
    const updateTaskCount = () => {
        const activeTasks = document.querySelectorAll('#task-list li:not(.completed)').length;
        // 繰り返しタスクを除外して未完了タスクをカウント
        const nonRecurringActiveTasks = Array.from(document.querySelectorAll('#task-list li:not(.completed)')).filter(item => {
            return !(item.dataset.recurrence && JSON.parse(item.dataset.recurrence));
        }).length;
        taskCount.textContent = `未完了: ${nonRecurringActiveTasks}件`;
    };

    const filterTasks = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedTag = tagFilterSelect.value; // 選択されたタグを取得
        const selectedPrioritySort = prioritySortSelect.value; // 選択された優先度ソート順を取得

        let tasksToFilter = Array.from(document.querySelectorAll('#task-list li'));

        // 優先度で並び替え
        if (selectedPrioritySort !== 'default') {
            tasksToFilter.sort((a, b) => {
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
                const priorityA = priorityOrder[a.dataset.priority || 'none'];
                const priorityB = priorityOrder[b.dataset.priority || 'none'];

                if (selectedPrioritySort === 'high-to-low') {
                    return priorityB - priorityA;
                } else { // low-to-high
                    return priorityA - priorityB;
                }
            });
            // 並び替えた順にDOMを更新
            tasksToFilter.forEach(item => taskList.appendChild(item));
        }

        tasksToFilter.forEach(item => {
            const taskText = item.querySelector('.task-text').textContent.toLowerCase();
            const isCompleted = item.classList.contains('completed');
            const itemTags = item.dataset.tags ? JSON.parse(item.dataset.tags) : [];

            const matchesSearch = taskText.includes(searchTerm);
            const matchesTag = selectedTag === 'all' || itemTags.includes(selectedTag); // タグフィルタリング

            let matchesFilter = false;
            if (currentFilter === 'all') {
                matchesFilter = true;
            } else if (currentFilter === 'active' && !isCompleted) {
                // 繰り返し設定があるタスクは未完了フィルタから除外
                matchesFilter = !(item.dataset.recurrence && JSON.parse(item.dataset.recurrence));
            } else if (currentFilter === 'completed' && isCompleted) {
                matchesFilter = true;
            } else if (currentFilter === 'recurring' && item.dataset.recurrence && JSON.parse(item.dataset.recurrence)) { // 繰り返しタスクのフィルタリング
                matchesFilter = true;
            }

            if (matchesFilter && matchesSearch && matchesTag) { // タグフィルタリングも条件に追加
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
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
        const headers = ['タスク名', '状態', '期日', 'タグ', '優先度', '作成日']; // ヘッダーに作成日を追加
        csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

        filteredTasks.forEach(task => {
            const status = task.completed ? '完了済み' : '未完了';
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
            const taskText = task.text.replace(/"/g, '""');
            const tags = task.tags ? task.tags.join(', ') : ''; // タグをカンマ区切りで取得
            const priority = task.priority || ''; // 優先度を取得
            const createdAt = task.createdAt ? new Date(parseInt(task.createdAt)).toLocaleDateString() : ''; // 作成日を取得

            const row = [`"${taskText}"`, `"${status}"`, `"${dueDate}"`, `"${tags}"`, `"${priority}"`, `"${createdAt}"`]; // 行に作成日を追加
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
    filterSelect.addEventListener('change', e => {
        currentFilter = e.target.value;
        updateApp();
    });
    clearCompletedButton.addEventListener('click', () => {
        document.querySelectorAll('#task-list li.completed').forEach(deleteTask);
    });
    themeToggle.addEventListener('change', toggleTheme);
    searchInput.addEventListener('input', updateApp);
    exportButton.addEventListener('click', exportTasksToCSV);
    tagFilterSelect.addEventListener('change', () => {
        tagFilterSelect.dataset.currentValue = tagFilterSelect.value; // 選択状態を保持
        updateApp();
    });
    prioritySortSelect.addEventListener('change', updateApp);

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