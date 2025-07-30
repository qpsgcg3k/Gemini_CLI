const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

// script.jsからテスト対象の関数をインポート
const { populateTagFilters, generateRecurringTasks } = require('./script.js');

describe('populateTagFilters', () => {
    let document;

    // テスト用のダミータスクデータ
    const tasks = [
        { id: 1, text: 'Work on Project A', completed: false, tags: ['work', 'projectA'] },
        { id: 2, text: 'Buy groceries', completed: true, tags: ['home', 'urgent'] },
        { id: 3, text: 'Schedule dentist appointment', completed: false, tags: ['health'] },
        { id: 4, text: 'Work on Project B', completed: true, tags: ['work', 'projectB'] },
        { id: 5, text: 'Clean the house', completed: false, tags: ['home'] },
    ];

    beforeEach(() => {
        const dom = new JSDOM(html, { url: "http://localhost/" });
        document = dom.window.document;
        global.document = document;
    });

    // Test 1: 初期表示（すべてのタスクからタグを抽出）
    test('should populate with tags from all tasks when no filter is applied', () => {
        populateTagFilters(document, tasks, 'all', '');
        const options = Array.from(document.getElementById('tag-filter-select').options).map(opt => opt.value);
        expect(options).toEqual(expect.arrayContaining(['all', 'work', 'projectA', 'home', 'urgent', 'health', 'projectB']));
        expect(options).toHaveLength(7);
    });

    // Test 2: 「未完了」フィルタ
    test('should populate with tags only from incomplete tasks when filter is "active"', () => {
        populateTagFilters(document, tasks, 'active', '');
        const options = Array.from(document.getElementById('tag-filter-select').options).map(opt => opt.value);
        // 未完了タスクのタグ: ['work', 'projectA', 'health', 'home']
        expect(options).toEqual(expect.arrayContaining(['all', 'work', 'projectA', 'health', 'home']));
        expect(options).toHaveLength(5);
    });

    // Test 3: 「完了済み」フィルタ
    test('should populate with tags only from completed tasks when filter is "completed"', () => {
        populateTagFilters(document, tasks, 'completed', '');
        const options = Array.from(document.getElementById('tag-filter-select').options).map(opt => opt.value);
        // 完了済みタスクのタグ: ['home', 'urgent', 'work', 'projectB']
        expect(options).toEqual(expect.arrayContaining(['all', 'home', 'urgent', 'work', 'projectB']));
        expect(options).toHaveLength(5);
    });

    // Test 4: 検索キーワードフィルタ
    test('should populate with tags only from tasks matching the search term', () => {
        populateTagFilters(document, tasks, 'all', 'work');
        const options = Array.from(document.getElementById('tag-filter-select').options).map(opt => opt.value);
        // 'work' を含むタスクのタグ: ['work', 'projectA', 'projectB']
        expect(options).toEqual(expect.arrayContaining(['all', 'work', 'projectA', 'projectB']));
        expect(options).toHaveLength(4);
    });

    
// Test 5: 複合フィルタ（未完了 + 検索）
    test('should populate with tags from incomplete tasks matching the search term', () => {
        populateTagFilters(document, tasks, 'active', 'project');
        const options = Array.from(document.getElementById('tag-filter-select').options).map(opt => opt.value);
        // 未完了かつ 'project' を含むタスクのタグ: ['work', 'projectA']
        expect(options).toEqual(expect.arrayContaining(['all', 'work', 'projectA']));
        expect(options).toHaveLength(3);
    });
});

describe('generateRecurringTasks', () => {
    beforeEach(() => {
        // JSDOMのセットアップ
        const dom = new JSDOM(html);
        global.document = dom.window.document;
        global.window = dom.window;
        global.fetch = jest.fn();
        global.alert = jest.fn();
        localStorage.clear();
    });

    test('should not show alert when holiday API fetch is successful', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ "2025-01-01": "元日" }),
        });

        await generateRecurringTasks();

        expect(alert).not.toHaveBeenCalled();
    });

    test('should show alert when holiday API fetch fails (response not ok)', async () => {
        fetch.mockResolvedValue({
            ok: false,
        });

        await generateRecurringTasks();

        expect(alert).toHaveBeenCalledWith('祝日APIの取得に失敗しました。オフラインの場合、祝日でもタスクが生成される可能性があります。');
    });

    test('should show alert when holiday API fetch throws an error', async () => {
        fetch.mockRejectedValue(new Error('Network error'));

        await generateRecurringTasks();

        expect(alert).toHaveBeenCalledWith('祝日APIの取得に失敗しました。オフラインの場合、祝日でもタスクが生成される可能性があります。');
    });
});
