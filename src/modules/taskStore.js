// src/modules/taskStore.js

let tasks = [];

const saveTasksToLocalStorage = () => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
};

export const loadTasksFromLocalStorage = () => {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    return tasks;
};

export const getTasks = () => tasks;

export const addTask = (task) => {
    tasks.push(task);
    saveTasksToLocalStorage();
};

export const deleteTask = (taskId) => {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasksToLocalStorage();
};

export const updateTask = (updatedTask) => {
    tasks = tasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
    saveTasksToLocalStorage();
};

export const getTaskById = (taskId) => {
    return tasks.find(task => task.id === taskId);
};

export const clearCompletedTasks = () => {
    tasks = tasks.filter(task => !task.completed);
    saveTasksToLocalStorage();
};

export const saveAllTasks = (allTasks) => {
    tasks = allTasks;
    saveTasksToLocalStorage();
};
