# 内部設計書

## 1. プロジェクト構成

- **`index.html`**: アプリケーションの基本構造を定義するHTMLファイル。
- **`style.css`**: アプリケーションのスタイルを定義するCSSファイル。ライトモードとダークモードのスタイルを含む。
- **`script.js`**: アプリケーションの全ロジックを記述するJavaScriptファイル。

## 2. データ管理

### 2.1. データ構造

タスクデータは以下のプロパティを持つオブジェクトの配列として管理される。

```javascript
{
    id: "一意のID",       // string or number (Date.now()を使用)
    text: "タスクの内容", // string
    completed: false,      // boolean
    dueDate: "2025-07-04",  // string (YYYY-MM-DD) or null
    recurrence: {          // object or null (繰り返し設定)
        type: "daily" | "weekly" | "monthly", // string
        days: [1, 3, 5],   // array of numbers (weeklyの場合: 0=日, 1=月, ...)
        day: 15,           // number (monthlyの場合: 1-31)
        lastGenerated: "2025-07-08" // string (YYYY-MM-DD), 最後にタスクが生成された日付
    } || null,
    templateId: "元のテンプレートタスクのID" // string or number, 繰り返しによって生成されたタスクの場合
}
```

### 2.2. データ永続化

- **タスクリスト**: `localStorage` を使用して、キー `tasks` にタスクデータの配列をJSON形式で保存・読み込みする。
- **テーマ設定**: `localStorage` を使用して、キー `theme` に `'dark'` または `'light'` の文字列を保存・読み込みする。

## 3. 主要なJavaScript関数とロジック

`script.js` は、DOMの読み込み完了後に実行される。

### 3.1. 初期化処理 (`loadApp`)

- `loadTheme()`: `localStorage` からテーマ設定を読み込み、`body` タグに `dark-mode` クラスを適用する。
- `generateRecurringTasks()`: 繰り返し設定に基づいて、期限が到来したタスクを自動生成する。
- `loadTasks()`: `localStorage` からタスクデータを読み込み、`createTaskElement` を使用してタスクリストを再構築する。

### 3.2. コア機能

- **`updateApp()`**: アプリケーションの状態が変更されたときに呼び出される。以下の関数を順に実行する。
    1.  `saveTasks()`: 現在のタスクリストの状態を `localStorage` に保存する。
    2.  `updateTaskCount()`: 未完了タスク数を計算し、表示を更新する。
    3.  `filterTasks()`: 現在のフィルタと検索条件に基づいてタスクの表示/非表示を切り替える。

### 3.3. タスク操作

- **`createTaskElement(text, completed, dueDate, recurrence, id)`**:
    - `<li>` 要素を生成し、タスク名、期日、繰り返しステータス、各種操作ボタン（繰り返し設定、期日設定、編集、削除）を含むHTMLを構築する。
    - 各ボタンとタスク名にイベントリスナーを設定する。
    - ドラッグ＆ドロップのためのイベントリスナー (`addDragAndDropListeners`) を設定する。
    - 繰り返し設定されたタスク（テンプレートタスク）には `is-template` クラスとテンプレートアイコンを追加する。
- **`addTask()`**:
    - 入力値を取得し、空でなければ `createTaskElement` を呼び出して新しいタスクをDOMに追加する。
    - `updateApp()` を呼び出して状態を更新・保存する。
- **`toggleCompleted(listItem)`**:
    - `listItem` の `completed` クラスを切り替える。
    - テンプレートタスクの場合は完了操作を無効にする。
    - `updateApp()` を呼び出す。
- **`deleteTask(listItem)`**:
    - `listItem` をDOMから削除する。
    - `updateApp()` を呼び出す。
- **`editTask(listItem, taskSpan)`**:
    - `taskSpan` を非表示にし、代わりに `<input>` 要素を挿入して編集モードにする。
    - `blur` または `keypress` イベントで編集を完了し、`updateApp()` を呼び出す。
- **`editDueDate(listItem, dueDateSpan)`**:
    - 日付入力用の `<input type="date">` を表示する。
    - 日付が選択されたら、`listItem` の `dataset.dueDate` を更新し、`updateApp()` を呼び出す。
- **`editRecurrence(listItem)`**:
    - 繰り返し設定用のモーダルを表示し、現在のタスクの繰り返し設定を読み込む。
- **`updateRecurrenceDisplay(span, recurrence)`**:
    - 繰り返し設定に基づいて、タスクの繰り返しステータス表示を更新する。
- **`generateRecurringTasks()`**:
    - `localStorage`からすべてのタスクを読み込む。
    - 繰り返し設定を持つタスク（テンプレート）を特定する。
    - 各テンプレートについて、`lastGenerated`の日付から今日までの間に生成されるべきタスクを計算する。
    - 未生成のタスクがあれば、新しいタスクとしてリストに追加し、`localStorage`を更新する。
    - テンプレートの`lastGenerated`を今日の日付に更新する。

- **`filterTasks()`**:
    - `currentFilter` 変数と検索入力の値に基づいて、各タスク (`<li>`) に `hidden` クラスを付け外しする。
- **`updateTaskCount()`**:
    - `.completed` クラスを持たない `<li>` 要素の数を数え、表示を更新する。

### 3.5. ドラッグ＆ドロップ

- **`addDragAndDropListeners(item)`**:
    - `dragstart` と `dragend` イベントを各タスク要素に設定する。
- **`taskList` の `dragover` イベント**:
    - `e.preventDefault()` を呼び出してドロップを許可する。
    - `getDragAfterElement` を使って、ドラッグ中の要素を挿入すべき位置を計算し、DOMを更新する。
- **`getDragAfterElement(container, y)`**:
    - マウスのY座標 (`y`) に基づいて、ドラッグ中の要素の直後にあるべき要素を特定する。

### 3.6. CSVエクスポート (`exportTasksToCSV`)

1.  `localStorage` からタスクデータを取得する。
2.  エクスポート選択ドロップダウンの値に基づいてタスクをフィルタリングする。
3.  ヘッダー行 (`タスク名,状態,期日`) を作成する。
4.  フィルタリングされた各タスクをCSVの行形式に変換する。
5.  BOM (`﻿`) を先頭に追加して文字化けを防ぐ。
6.  `Blob` オブジェクトを生成し、ダウンロード用の `<a>` タグを動的に作成してクリックさせ、CSVファイルをダウンロードさせる。

### 3.7. テーマ管理

- **`toggleTheme()`**:
    - `body` タグの `dark-mode` クラスの有無を切り替える。
    - 現在のテーマ状態を `localStorage` に保存する。

## 4. CSS設計 (`style.css`)

- **CSS変数 (`:root`)**:
    - ライトモードの配色を定義する。
    - `body.dark-mode` セレクタ内でダークモードの配色を上書き定義する。これにより、テーマの切り替えを効率的に行う。
- **クラスベースのスタイリング**:
    - `.completed`: 完了したタスクのスタイル。
    - `.hidden`: フィルタリングで非表示にするタスクのスタイル。
    - `.dragging`: ドラッグ中のタスクのスタイル。
    - `.overdue`: 期限切れのタスクのスタイル。
- **レスポンシブデザイン**:
    - `@media (max-width: 600px)` を使用して、モバイルデバイス向けのスタイル調整を行う。
