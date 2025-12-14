// src/app.js
import { loadTasksFromLocalStorage, addTask, updateTask, getTasks, saveAllTasks, getTaskById, clearCompletedTasks } from './modules/taskStore.js';
import { generateRecurringTasks } from './modules/recurring.js';
import { initializeModal, openRecurrenceModal } from './modules/modal.js';
import { 
    initializeDOMElements,
    renderTasks,
    updateTaskCount,
    populateTagFilters,
    filterTasks,
    handleDragOver,
    exportTasksToCSV,
    loadTheme,
    toggleTheme 
} from './modules/ui.js';

const app = {
    currentFilter: 'active',
    
    async init() {
        // DOM Elements
        this.taskInput = document.getElementById('task-input');
        this.addButton = document.getElementById('add-button');
        this.taskList = document.getElementById('task-list');
        this.filterSelect = document.getElementById('filter-select');
        this.clearCompletedButton = document.getElementById('clear-completed-button');
        this.themeToggle = document.getElementById('theme-toggle');
        this.searchInput = document.getElementById('search-input');
        this.exportButton = document.getElementById('export-button');
        this.tagInput = document.getElementById('tag-input');
        this.prioritySelect = document.getElementById('priority-select');
        this.tagFilterSelect = document.getElementById('tag-filter-select');
        this.prioritySortSelect = document.getElementById('priority-sort-select');

        initializeDOMElements();
        initializeModal(this);
        
        loadTheme();
        loadTasksFromLocalStorage();
        await generateRecurringTasks();
        
        this.addEventListeners();
        this.updateApp();
    },

    addEventListeners() {
        this.addButton.addEventListener('click', () => this.addNewTask());
        this.taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') this.addNewTask(); });
        this.filterSelect.addEventListener('change', e => {
            this.currentFilter = e.target.value;
            this.updateApp();
        });
        this.clearCompletedButton.addEventListener('click', () => {
            clearCompletedTasks();
            this.updateApp();
        });
        this.themeToggle.addEventListener('change', toggleTheme);
        this.searchInput.addEventListener('input', () => this.updateApp());
        this.exportButton.addEventListener('click', exportTasksToCSV);
        this.tagFilterSelect.addEventListener('change', () => this.updateApp());
        this.prioritySortSelect.addEventListener('change', () => this.updateApp());
        this.taskList.addEventListener('dragover', handleDragOver);
        this.taskList.addEventListener('dragend', () => this.saveTaskOrder());
    },

    updateApp() {
        this.saveTaskOrder();
        renderTasks(this);
        updateTaskCount();
        populateTagFilters(document, getTasks(), this.currentFilter, this.searchInput.value.toLowerCase());
        filterTasks(this.currentFilter);
    },

    addNewTask() {
        const taskText = this.taskInput.value.trim();
        if (taskText === '') {
            alert('タスクを入力してください。');
            return;
        }
        const tags = this.tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const priority = this.prioritySelect.value;
        
        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            completed: false,
            dueDate: null,
            recurrence: null,
            tags: tags,
            priority: priority,
            createdAt: Date.now()
        };

        addTask(newTask);
        this.updateApp();

        this.taskInput.value = '';
        this.tagInput.value = '';
        this.prioritySelect.value = 'none';
    },

    toggleCompleted(taskId) {
        const task = getTaskById(taskId);
        if (task && !task.recurrence) {
            task.completed = !task.completed;
            updateTask(task);
            this.updateApp();
        }
    },
    
    editRecurrence(taskId) {
        openRecurrenceModal(taskId);
    },

    saveTaskOrder() {
        const orderedTasks = [];
        document.querySelectorAll('#task-list li').forEach(li => {
            const task = getTaskById(li.dataset.id);
            if (task) {
                orderedTasks.push(task);
            }
        });
        saveAllTasks(orderedTasks);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
