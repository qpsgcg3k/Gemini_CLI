const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

describe('Reminder Functions', () => {
    let document;
    let window;
    let localStorageMock;
    let script;

    beforeEach(() => {
        jest.resetModules();
        const dom = new JSDOM(html, { runScripts: "dangerously" });
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;

        localStorageMock = (() => {
            let store = {};
            return {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = value.toString(); },
                clear: () => { store = {}; },
                removeItem: (key) => { delete store[key]; }
            };
        })();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

        script = require('./script.js');
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should save a task with reminderRule and reminderAt properties', () => {
        const reminderRule = { type: 'relative', value: { amount: 30, unit: 'minutes' } };
        const dueDate = new Date('2025-09-01T12:00:00Z');
        const expectedReminderAt = new Date(dueDate.getTime() - 30 * 60 * 1000).toISOString();
        const taskObject = script.createTaskObject('New Reminder Task', false, dueDate.toISOString(), null, 'task-1', [], 'none', Date.now(), reminderRule, expectedReminderAt);

        script.createTaskElement(document, taskObject);
        script.saveTasks(document);

        const savedTasks = JSON.parse(localStorage.getItem('tasks'));
        expect(savedTasks).toHaveLength(1);
        const savedTask = savedTasks[0];
        expect(savedTask).toHaveProperty('reminderRule');
        expect(savedTask).toHaveProperty('reminderAt');
        expect(savedTask.reminderRule).toEqual(reminderRule);
        expect(savedTask.reminderAt).toBe(expectedReminderAt);
    });

    test('getReminderRuleFromUI should return correct rule object for relative time', () => {
        document.getElementById('reminder-enabled').checked = true;
        document.getElementById('reminder-type-select').value = 'relative';
        document.getElementById('reminder-amount').value = '45';
        document.getElementById('reminder-unit').value = 'hours';
        const rule = script.getReminderRuleFromUI(document);
        expect(rule).toEqual({ type: 'relative', value: { amount: 45, unit: 'hours' } });
    });

    test('getReminderRuleFromUI should return correct rule object for absolute time', () => {
        document.getElementById('reminder-enabled').checked = true;
        document.getElementById('reminder-type-select').value = 'absolute';
        document.getElementById('reminder-datetime').value = '2025-10-31T10:00';
        const rule = script.getReminderRuleFromUI(document);
        expect(rule).toEqual({ type: 'absolute', value: '2025-10-31T10:00' });
    });

    test('getReminderRuleFromUI should return null if reminder is disabled', () => {
        document.getElementById('reminder-enabled').checked = false;
        const rule = script.getReminderRuleFromUI(document);
        expect(rule).toBeNull();
    });

    test('calculateReminderAt should return correct absolute time for relative rule', () => {
        const dueDate = new Date('2025-11-10T20:00:00Z');
        const rule = { type: 'relative', value: { amount: 2, unit: 'hours' } };
        const expectedReminderAt = new Date('2025-11-10T18:00:00Z').toISOString();
        const reminderAt = script.calculateReminderAt(dueDate, rule);
        expect(reminderAt).toBe(expectedReminderAt);
    });

    test('calculateReminderAt should return correct absolute time for absolute rule', () => {
        const dueDate = new Date('2025-11-10T20:00:00Z');
        const rule = { type: 'absolute', value: '2025-11-09T10:00:00Z' };
        const expectedReminderAt = new Date('2025-11-09T10:00:00Z').toISOString();
        const reminderAt = script.calculateReminderAt(dueDate, rule);
        expect(reminderAt).toBe(expectedReminderAt);
    });

    test('calculateReminderAt should return null if rule is null', () => {
        const dueDate = new Date();
        const reminderAt = script.calculateReminderAt(dueDate, null);
        expect(reminderAt).toBeNull();
    });
});

describe('Scheduling Functions', () => {
    let script;
    beforeEach(() => {
        jest.resetModules();
        script = require('./script.js');
    });

    test('findDueReminders should return only tasks that are due and not yet notified', () => {
        const now = new Date();
        const tasks = [
            { id: 1, text: 'Task 1', reminderAt: new Date(now.getTime() - 1000).toISOString(), reminderNotified: false },
            { id: 2, text: 'Task 2', reminderAt: new Date(now.getTime() - 2000).toISOString(), reminderNotified: true },
            { id: 3, text: 'Task 3', reminderAt: new Date(now.getTime() + 10000).toISOString(), reminderNotified: false },
            { id: 4, text: 'Task 4', reminderAt: null, reminderNotified: false },
            { id: 5, text: 'Task 5', reminderAt: new Date(now.getTime() - 5000).toISOString(), reminderNotified: false },
        ];
        const dueTasks = script.findDueReminders(tasks);
        expect(dueTasks).toHaveLength(2);
        expect(dueTasks.map(t => t.id)).toEqual([1, 5]);
    });
});

// JSDOM doesn't include a Service Worker environment, so we mock it.
const mockServiceWorker = () => {
    const listeners = {};
    global.self = {
        addEventListener: (event, callback) => {
            listeners[event] = callback;
        },
        registration: {
            showNotification: jest.fn().mockResolvedValue(),
        },
        clients: {
            matchAll: jest.fn().mockResolvedValue([]),
            openWindow: jest.fn().mockResolvedValue(null),
        },
    };
    return {
        trigger: (event, data) => {
            if (listeners[event]) {
                listeners[event](data);
            }
        },
    };
};

describe('Service Worker Logic', () => {
    let serviceWorker;

    beforeEach(() => {
        jest.resetModules(); // モジュールキャッシュをリセット
        serviceWorker = mockServiceWorker();
        // service-worker.jsを動的に読み込む
        require('./service-worker.js');
    });

    test('should show notification and send ack on REMINDER message', async () => {
        const mockSource = { postMessage: jest.fn() };
        const task = { id: '123', text: 'Test Task' };
        const waitUntilPromises = [];
        const event = {
            data: { type: 'REMINDER', task: task },
            source: mockSource,
            waitUntil: (promise) => waitUntilPromises.push(promise),
        };

        serviceWorker.trigger('message', event);
        await Promise.all(waitUntilPromises);

        expect(self.registration.showNotification).toHaveBeenCalledWith('リマインダー', {
            body: 'Test Task の時間です',
            data: { taskId: '123', url: '/' },
        });
        expect(mockSource.postMessage).toHaveBeenCalledWith({
            type: 'REMINDER_ACK',
            taskId: '123',
        });
        expect(waitUntilPromises.length).toBe(1);
    });

    test('should focus existing window on notification click', async () => {
        const mockClient = { url: '/', focus: jest.fn() };
        self.clients.matchAll.mockResolvedValue([mockClient]);
        const waitUntilPromises = [];
        const event = {
            notification: {
                close: jest.fn(),
                data: { url: '/' },
            },
            waitUntil: (promise) => waitUntilPromises.push(promise),
        };

        serviceWorker.trigger('notificationclick', event);
        await Promise.all(waitUntilPromises);

        expect(mockClient.focus).toHaveBeenCalled();
        expect(self.clients.openWindow).not.toHaveBeenCalled();
    });

    test('should open new window if none exists on notification click', async () => {
        self.clients.matchAll.mockResolvedValue([]);
        const waitUntilPromises = [];
        const event = {
            notification: {
                close: jest.fn(),
                data: { url: '/new-page' },
            },
            waitUntil: (promise) => waitUntilPromises.push(promise),
        };

        serviceWorker.trigger('notificationclick', event);
        await Promise.all(waitUntilPromises);

        expect(self.clients.openWindow).toHaveBeenCalledWith('/new-page');
    });
});