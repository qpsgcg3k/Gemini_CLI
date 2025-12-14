// src/modules/modal.js
import { getTaskById, updateTask } from './taskStore.js';

let recurrenceModal;
let closeButton;
let saveRecurrenceButton;
let cancelRecurrenceButton;
let recurrenceType;
let weeklyOptions;
let monthlyOptions;
let weekdaySelector;
let monthlyDayInput;

let currentEditingListItem = null;
let currentEditingTaskId = null;
let app;

export const initializeModal = (mainApp) => {
    app = mainApp;
    recurrenceModal = document.getElementById('recurrence-modal');
    closeButton = document.querySelector('.close-button');
    saveRecurrenceButton = document.getElementById('save-recurrence-button');
    cancelRecurrenceButton = document.getElementById('cancel-recurrence-button');
    recurrenceType = document.getElementById('recurrence-type');
    weeklyOptions = document.getElementById('weekly-options');
    monthlyOptions = document.getElementById('monthly-options');
    weekdaySelector = document.querySelector('.weekday-selector');
    monthlyDayInput = document.getElementById('monthly-day');

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
};

export const openRecurrenceModal = (taskId) => {
    currentEditingTaskId = taskId;
    const task = getTaskById(taskId);
    currentEditingListItem = document.querySelector(`[data-id="${taskId}"]`);
    const recurrence = task.recurrence;

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
    currentEditingTaskId = null;
};

const saveRecurrence = () => {
    if (!currentEditingTaskId) return;

    const type = recurrenceType.value;
    let recurrence = null;

    if (type !== 'none') {
        recurrence = { type: type, lastGenerated: new Date().toISOString().split('T')[0] };
        if (type === 'weekly') {
            const selectedDays = [];
            weekdaySelector.querySelectorAll('span.selected').forEach((span) => {
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
    
    const task = getTaskById(currentEditingTaskId);
    task.recurrence = recurrence;
    updateTask(task);
    
    app.updateApp();
    closeRecurrenceModal();
};

const toggleRecurrenceDetails = () => {
    weeklyOptions.style.display = recurrenceType.value === 'weekly' ? 'block' : 'none';
    monthlyOptions.style.display = recurrenceType.value === 'monthly' ? 'block' : 'none';
};
