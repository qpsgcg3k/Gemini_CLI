# 2025-08-18_01_issue21_reminder.md

## 機能名: リマインダー通知機能の追加

### 概要
GitHub Issue #21 で提案されたリマインダー通知機能の実装ログ。タスクの期日が近づいた際に、ブラウザのWeb Push通知を利用してユーザーに通知する機能を追加した。

### 実装内容

#### 1. データモデルの更新
-   タスクオブジェクトに以下のプロパティを追加:
    -   `reminderRule`: ユーザーが設定したリマインダーのルール（例: `{ type: 'relative', value: { amount: 30, unit: 'minutes' } }` または `{ type: 'absolute', value: '2025-10-31T10:00' }`）。
    -   `reminderAt`: `reminderRule` とタスクの期日 (`dueDate`) から計算された、通知を送信する絶対日時（ISO文字列）。
    -   `reminderNotified`: 通知済みかどうかを示すブーリアンフラグ（`true` の場合、再通知しない）。
-   `script.js` の `createTaskObject` 関数を更新し、これらのプロパティを初期化するようにした。
-   `script.js` の `saveTasks` 関数を更新し、これらのプロパティを `localStorage` に保存するようにした。

#### 2. リマインダー設定UIの実装
-   `index.html` にリマインダー設定用のUI要素を追加:
    -   リマインダーの有効/無効を切り替えるチェックボックス (`#reminder-enabled`)。
    -   「相対日時」と「絶対日時」を選択するセレクトボックス (`#reminder-type-select`)。
    -   相対日時用の数値入力 (`#reminder-amount`) と単位セレクトボックス (`#reminder-unit`)。
    -   絶対日時用の `datetime-local` 入力 (`#reminder-datetime`)。
-   `style.css` にこれらのUI要素の基本的なスタイルを追加し、表示を整えた。
-   `script.js` の `initializeApp` 関数に、以下のUI制御ロジックを追加:
    -   `#reminder-enabled` チェックボックスのON/OFFに応じて、詳細設定エリア (`#reminder-options`) の表示/非表示を切り替える。
    -   `#reminder-type-select` の選択に応じて、「相対日時」または「絶対日時」の入力欄の表示/非表示を切り替える。
    -   `getReminderRuleFromUI` 関数を新設し、UIの入力値から `reminderRule` オブジェクトを生成するようにした。この関数はテスト可能にするためエクスポートした。

#### 3. 通知機能のコアロジック
-   アプリケーション起動時、またはユーザーがリマインダーを有効にした際に、ブラウザに通知許可を要求する `Notification.requestPermission()` を呼び出す処理を `script.js` に追加した。
-   通知が拒否されている場合に、「通知をオンにしてください」というメッセージを画面に表示するUI (`#notification-permission-alert`) を `index.html` と `style.css` に追加し、`script.js` で表示制御を行った。
-   Service Worker (`service-worker.js`) を登録する処理を `script.js` の `initializeApp` 関数に追加した。

#### 4. 通知スケジューリング
-   `script.js` の `initializeApp` 関数内に `setInterval` を使用し、1分ごとに `localStorage` からタスクをチェックするスケジューリング処理を実装した。
-   `findDueReminders` 関数を新設し、`reminderAt` が過去の時刻であり、かつ `reminderNotified` が `false` のタスクを検出するようにした。この関数はテスト可能にするためエクスポートした。
-   検出された通知対象のタスクは、`navigator.serviceWorker.controller.postMessage()` を使って Service Worker に送信するようにした。
-   通知を送信したタスクは `reminderNotified` を `true` に更新し、`localStorage` に保存するようにした。

#### 5. Service Worker と通知表示
-   `service-worker.js` に `self.addEventListener('message', ...)` を追加し、メインスレッドからの `REMINDER` タイプメッセージを受け取るようにした。
-   受け取ったタスク情報 (`task.text`) を基に、`self.registration.showNotification()` を呼び出し、デスクトップ通知を表示するようにした。通知のタイトルは「リマインダー」、本文は「(タスク名) の時間です」とした。
-   `service-worker.js` に `self.addEventListener('notificationclick', ...)` を追加し、通知クリック時に `clients.openWindow()` でアプリケーションのタブを開き、既に開いている場合はフォーカスするようにした。

### テスト
-   `script.test.js` に以下のテストケースを追加し、TDDサイクルに従って実装を進めた。
    -   タスクオブジェクトに `reminderRule` と `reminderAt` プロパティが正しく保存されること。
    -   `getReminderRuleFromUI` がUIの入力値から正しい `reminderRule` オブジェクトを生成すること（相対日時、絶対日時、無効な場合）。
    -   `calculateReminderAt` が期日とルールから正しい `reminderAt` を計算すること（相対日時、絶対日時、ルールがない場合）。
    -   `findDueReminders` が通知すべきタスクを正しく検出すること。
-   Service Workerのテストは、環境構築の複雑さから `test.todo` でプレースホルダーを記述し、今後の課題とした。
