// src/modules/recurring.js
import { getHolidays } from './api.js';
import { getTasks, saveAllTasks } from './taskStore.js';

export const generateRecurringTasks = async () => {
    const tasks = getTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newTasksGenerated = false;

    const holidays = await getHolidays() || {};

    const templates = tasks.filter(t => t.recurrence && t.recurrence.type !== 'none');

    for (const template of templates) {
        let lastGenerated = template.recurrence.lastGenerated ? new Date(template.recurrence.lastGenerated) : new Date(parseInt(template.id));
        lastGenerated.setHours(0, 0, 0, 0);

        let nextDueDate = new Date(lastGenerated);

        while (nextDueDate < today) {
            switch (template.recurrence.type) {
                case 'daily':
                    nextDueDate.setDate(nextDueDate.getDate() + 1);
                    break;
                case 'weekly':
                    do {
                        nextDueDate.setDate(nextDueDate.getDate() + 1);
                    } while (!template.recurrence.days.includes(nextDueDate.getDay()));
                    break;
                case 'monthly':
                    nextDueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, template.recurrence.day);
                    break;
            }

            if (nextDueDate <= today) {
                const yyyy = nextDueDate.getFullYear();
                const mm = String(nextDueDate.getMonth() + 1).padStart(2, '0');
                const dd = String(nextDueDate.getDate()).padStart(2, '0');
                const dueDateString = `${yyyy}-${mm}-${dd}`;

                const dayOfWeek = nextDueDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = holidays[dueDateString];

                if (!isWeekend && !isHoliday) {
                    const taskExists = tasks.some(t => t.templateId === template.id && t.dueDate === dueDateString);

                    if (!taskExists) {
                        const newTask = {
                            id: Date.now() + Math.random(),
                            templateId: template.id,
                            text: template.text,
                            completed: false,
                            dueDate: dueDateString,
                            recurrence: null,
                            tags: template.tags || [],
                            priority: template.priority || 'none',
                            createdAt: Date.now()
                        };
                        tasks.push(newTask);
                        newTasksGenerated = true;
                    }
                }
            }
        }
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        template.recurrence.lastGenerated = `${yyyy}-${mm}-${dd}`;
    }

    if (newTasksGenerated) {
        saveAllTasks(tasks);
    }
};
