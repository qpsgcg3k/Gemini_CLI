// This file is intentionally left blank for now.
// It will be populated with notification handling logic in a later step.

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REMINDER') {
        const task = event.data.task;
        console.log('Service Worker received reminder for task:', task.text);

        const title = 'リマインダー';
        const options = {
            body: `${task.text} の時間です`,
            icon: '/path/to/your/icon.png', // TODO: アプリのアイコンパスを設定
            data: {
                taskId: task.id,
                url: '/' // TODO: アプリのタスク詳細URLを設定
            }
        };

        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/'; // デフォルトはルートパス

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // 既存のウィンドウを探す
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 既存のウィンドウがなければ新しいウィンドウを開く
            return clients.openWindow(urlToOpen);
        })
    );
});
