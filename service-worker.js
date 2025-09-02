// This file is intentionally left blank for now.
// It will be populated with notification handling logic in a later step.

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REMINDER') {
        const task = event.data.task;
        console.log('Service Worker received reminder for task:', task.text);

        const title = 'リマインダー';
        const options = {
            body: `${task.text} の時間です`,
            data: {
                taskId: task.id,
                url: '/'
            }
        };

        const promise = self.registration.showNotification(title, options).then(() => {
            // 通知が表示されたら、クライアントに確認メッセージを送信
            if (event.source) {
                event.source.postMessage({ type: 'REMINDER_ACK', taskId: task.id });
            }
        }).catch((err) => {
            console.error('Notification failed:', err);
            // オプショナル：失敗したことをクライアントに通知する
            if (event.source) {
                event.source.postMessage({ type: 'REMINDER_FAILED', taskId: task.id, error: err.message });
            }
        });

        event.waitUntil(promise);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/'; // デフォルトはルートパス

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(windowClients => {
            // 既存のウィンドウを探す
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 既存のウィンドウがなければ新しいウィンドウを開く
            return self.clients.openWindow(urlToOpen);
        })
    );
});
