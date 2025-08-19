let currentFilter = 'active';
let searchInput;

// ----------------------------------------------------------------------------
// Pure Functions (No DOM access, testable)
// ----------------------------------------------------------------------------

const createTaskObject = (text, completed, dueDate, recurrence, id, tags, priority, createdAt, reminderRule, reminderAt) => ({
    id: id || Date.now(),
    text: text,
    completed: completed,
    dueDate: dueDate || null,
    recurrence: recurrence || null,
    tags: tags || [],
    priority: priority || 'none',
    createdAt: createdAt || Date.now(),
    reminderRule: reminderRule || null,
    reminderAt: reminderAt || null,
    reminderNotified: false // 通知済みフラグ
});

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
    if (!rule || !dueDate) {
        return null;
    }

    const dueDateObj = new Date(dueDate);

    if (rule.type === 'absolute') {
        return new Date(rule.value).toISOString();
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

// ----------------------------------------------------------------------------
// DOM Manipulation Functions (Depend on DOM, but testable with JSDOM)
// ----------------------------------------------------------------------------

const saveTasks = (document) => {
    const tasks = [];
    document.querySelectorAll('#task-list li').forEach(listItem => {
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

const createTaskElement = (document, task) => {
    const listItem = document.createElement('li');
    listItem.setAttribute('draggable', 'true');
    listItem.dataset.id = task.id;
    if (task.completed) listItem.classList.add('completed');
    if (task.dueDate) listItem.dataset.dueDate = task.dueDate;
    if (task.recurrence) {
        listItem.dataset.recurrence = JSON.stringify(task.recurrence);
        listItem.classList.add('is-template');
    }
    if (task.tags && task.tags.length > 0) listItem.dataset.tags = JSON.stringify(task.tags);
    if (task.priority && task.priority !== 'none') listItem.dataset.priority = task.priority;
    listItem.dataset.createdAt = task.createdAt;
    if (task.reminderRule) listItem.dataset.reminderRule = JSON.stringify(task.reminderRule);
    if (task.reminderAt) listItem.dataset.reminderAt = task.reminderAt;

    const taskTextSpan = document.createElement('span');
    taskTextSpan.className = 'task-text';
    taskTextSpan.textContent = task.text;
    listItem.appendChild(taskTextSpan);

    return listItem;
};

// ----------------------------------------------------------------------------
// Initializer Function (Sets up event listeners)
// ----------------------------------------------------------------------------

function initializeApp(document) {
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    const reminderEnabledCheckbox = document.getElementById('reminder-enabled');
    const reminderOptionsDiv = document.getElementById('reminder-options');
    const reminderTypeSelect = document.getElementById('reminder-type-select');
    const reminderValueRelativeDiv = document.getElementById('reminder-value-relative');
    const reminderValueAbsoluteDiv = document.getElementById('reminder-value-absolute');
    const notificationPermissionAlert = document.getElementById('notification-permission-alert');

    const loadTasks = () => {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            const tasks = JSON.parse(savedTasks);
            tasks.forEach(task => {
                const listItem = createTaskElement(document, task);
                taskList.appendChild(listItem);
            });
        }
    };

    // Load tasks on startup
    loadTasks();

    const checkNotificationPermission = () => {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'denied') {
            notificationPermissionAlert.classList.remove('hidden');
            reminderEnabledCheckbox.disabled = true;
        } else {
            notificationPermissionAlert.classList.add('hidden');
            reminderEnabledCheckbox.disabled = false;
        }
    };

    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        const reminderRule = getReminderRuleFromUI(document);
        const reminderAt = null; // This will be calculated later

        const newTaskObject = createTaskObject(taskText, false, null, null, null, [], 'none', Date.now(), reminderRule, reminderAt);
        const listItem = createTaskElement(document, newTaskObject);
        taskList.appendChild(listItem);
        
        saveTasks(document);

        taskInput.value = '';
        if(reminderEnabledCheckbox) reminderEnabledCheckbox.checked = false;
        if(reminderOptionsDiv) reminderOptionsDiv.classList.add('hidden');
    };

    if(addButton) addButton.addEventListener('click', addTask);
    if(taskInput) taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

    if(reminderEnabledCheckbox) {
        reminderEnabledCheckbox.addEventListener('change', () => {
            reminderOptionsDiv.classList.toggle('hidden', !reminderEnabledCheckbox.checked);

            if (reminderEnabledCheckbox.checked && Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    // Update UI based on new permission status
                    checkNotificationPermission();
                });
            }
        });
    }

    if(reminderTypeSelect) {
        reminderTypeSelect.addEventListener('change', () => {
            const isRelative = reminderTypeSelect.value === 'relative';
            reminderValueRelativeDiv.classList.toggle('hidden', !isRelative);
            reminderValueAbsoluteDiv.classList.toggle('hidden', isRelative);
        });
    }

    // Initial check when the app loads
    checkNotificationPermission();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    // Schedule reminder checks
    setInterval(() => {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const dueTasks = findDueReminders(tasks);

        dueTasks.forEach(task => {
            if ('Notification' in window && Notification.permission === 'granted') {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'REMINDER', task: task });
                    console.log(`Sent reminder to Service Worker for task: ${task.text}`);
                } else {
                    // Fallback for when Service Worker is not active (e.g., first load before SW is ready)
                    // This part will be replaced by actual notification display in the main thread if SW is not available
                    console.log(`Service Worker not active, reminder for task: ${task.text}`);
                }
            }
            // Mark as notified regardless of whether SW is active or not, to prevent re-notification
            task.reminderNotified = true;
        });

        if (dueTasks.length > 0) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }, 60 * 1000); // Check every 1 minute (60000 ms)
}

// ----------------------------------------------------------------------------
// Main Execution & Exports
// ----------------------------------------------------------------------------

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => initializeApp(document));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        createTaskObject,
        createTaskElement,
        saveTasks,
        getReminderRuleFromUI,
        calculateReminderAt,
        findDueReminders
    };
}
