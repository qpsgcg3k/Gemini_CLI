const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

// script.jsからテスト対象の関数をインポート
const { 
    createTaskElement, 
    saveTasks,
    createTaskObject,
    getReminderRuleFromUI,
    calculateReminderAt,
    findDueReminders
} = require('./script.js');

describe('Reminder Functions', () => {
    let document;
    let window;
    let localStorageMock;

    beforeEach(() => {
        const dom = new JSDOM(html);
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;

        // localStorageのモック
        localStorageMock = (() => {
            let store = {};
            return {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = value.toString(); },
                clear: () => { store = {}; },
                removeItem: (key) => { delete store[key]; }
            };
        })();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should save a task with reminderRule and reminderAt properties', () => {
        // 1. Arrange: テストの準備
        const taskList = document.getElementById('task-list');
        const reminderRule = { type: 'relative', value: { amount: 30, unit: 'minutes' } };
        const dueDate = new Date('2025-09-01T12:00:00Z');
        const expectedReminderAt = new Date(dueDate.getTime() - 30 * 60 * 1000).toISOString();

        const taskObject = createTaskObject('New Reminder Task', false, dueDate.toISOString(), null, 'task-1', [], 'none', Date.now(), reminderRule, expectedReminderAt);

        // 2. Act: 実行
        const listItem = createTaskElement(document, taskObject);
        taskList.appendChild(listItem);
        saveTasks(document);

        // 3. Assert: 確認
        const savedTasks = JSON.parse(localStorage.getItem('tasks'));
        expect(savedTasks).toHaveLength(1);
        const savedTask = savedTasks[0];

        expect(savedTask).toHaveProperty('reminderRule');
        expect(savedTask).toHaveProperty('reminderAt');
        expect(savedTask.reminderRule).toEqual(reminderRule);
        expect(savedTask.reminderAt).toBe(expectedReminderAt);
    });

    test('getReminderRuleFromUI should return correct rule object for relative time', () => {
        // 1. Arrange
        document.getElementById('reminder-enabled').checked = true;
        document.getElementById('reminder-type-select').value = 'relative';
        document.getElementById('reminder-amount').value = '45';
        document.getElementById('reminder-unit').value = 'hours';

        // 2. Act
        const rule = getReminderRuleFromUI(document);

        // 3. Assert
        expect(rule).toEqual({
            type: 'relative',
            value: { amount: 45, unit: 'hours' }
        });
    });

    test('getReminderRuleFromUI should return correct rule object for absolute time', () => {
        // 1. Arrange
        document.getElementById('reminder-enabled').checked = true;
        document.getElementById('reminder-type-select').value = 'absolute';
        document.getElementById('reminder-datetime').value = '2025-10-31T10:00';

        // 2. Act
        const rule = getReminderRuleFromUI(document);

        // 3. Assert
        expect(rule).toEqual({
            type: 'absolute',
            value: '2025-10-31T10:00'
        });
    });

    test('getReminderRuleFromUI should return null if reminder is disabled', () => {
        // 1. Arrange
        document.getElementById('reminder-enabled').checked = false;

        // 2. Act
        const rule = getReminderRuleFromUI(document);

        // 3. Assert
        expect(rule).toBeNull();
    });

    test('calculateReminderAt should return correct absolute time for relative rule', () => {
        // 1. Arrange
        const dueDate = new Date('2025-11-10T20:00:00Z');
        const rule = { type: 'relative', value: { amount: 2, unit: 'hours' } };
        const expectedReminderAt = new Date('2025-11-10T18:00:00Z').toISOString();

        // 2. Act
        const reminderAt = calculateReminderAt(dueDate, rule);

        // 3. Assert
        expect(reminderAt).toBe(expectedReminderAt);
    });

    test('calculateReminderAt should return correct absolute time for absolute rule', () => {
        // 1. Arrange
        const dueDate = new Date('2025-11-10T20:00:00Z');
        const rule = { type: 'absolute', value: '2025-11-09T10:00:00Z' };
        const expectedReminderAt = new Date('2025-11-09T10:00:00Z').toISOString();

        // 2. Act
        const reminderAt = calculateReminderAt(dueDate, rule);

        // 3. Assert
        expect(reminderAt).toBe(expectedReminderAt);
    });

    test('calculateReminderAt should return null if rule is null', () => {
        // 1. Arrange
        const dueDate = new Date();

        // 2. Act
        const reminderAt = calculateReminderAt(dueDate, null);

        // 3. Assert
        expect(reminderAt).toBeNull();
    });
});

describe('Scheduling Functions', () => {
    test('findDueReminders should return only tasks that are due and not yet notified', () => {
        // 1. Arrange
        const now = new Date();
        const tasks = [
            // Due, not notified -> Should be found
            { id: 1, text: 'Task 1', reminderAt: new Date(now.getTime() - 1000).toISOString(), reminderNotified: false },
            // Due, but already notified -> Should NOT be found
            { id: 2, text: 'Task 2', reminderAt: new Date(now.getTime() - 2000).toISOString(), reminderNotified: true },
            // Not due yet -> Should NOT be found
            { id: 3, text: 'Task 3', reminderAt: new Date(now.getTime() + 10000).toISOString(), reminderNotified: false },
            // No reminder set -> Should NOT be found
            { id: 4, text: 'Task 4', reminderAt: null, reminderNotified: false },
             // Due, not notified -> Should be found
            { id: 5, text: 'Task 5', reminderAt: new Date(now.getTime() - 5000).toISOString(), reminderNotified: false },
        ];

        // 2. Act
        const dueTasks = findDueReminders(tasks);

        // 3. Assert
        expect(dueTasks).toHaveLength(2);
        expect(dueTasks.map(t => t.id)).toEqual([1, 5]);
    });
});

describe('Service Worker Notification Display', () => {
    test.todo('should display a notification with correct title and body');
    test.todo('should focus the app tab when notification is clicked');
});