
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const RecurrenceModal = ({ task, isOpen, onClose, onSave }) => {
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyDay, setMonthlyDay] = useState('');

  useEffect(() => {
    if (task && task.recurrence) {
      setRecurrenceType(task.recurrence.type || 'none');
      if (task.recurrence.type === 'weekly') {
        setWeeklyDays(task.recurrence.days || []);
      }
      if (task.recurrence.type === 'monthly') {
        setMonthlyDay(task.recurrence.day || '');
      }
    } else {
      setRecurrenceType('none');
      setWeeklyDays([]);
      setMonthlyDay('');
    }
  }, [task]);

  const handleSave = () => {
    let recurrence = null;
    if (recurrenceType !== 'none') {
      recurrence = { type: recurrenceType, lastGenerated: task?.recurrence?.lastGenerated || new Date().toISOString().split('T')[0] };
      if (recurrenceType === 'weekly') {
        if (weeklyDays.length === 0) {
          alert('曜日を少なくとも1つ選択してください。');
          return;
        }
        recurrence.days = weeklyDays;
      } else if (recurrenceType === 'monthly') {
        const day = parseInt(monthlyDay, 10);
        if (!day || day < 1 || day > 31) {
          alert('1から31の有効な日付を入力してください。');
          return;
        }
        recurrence.day = day;
      }
    }
    onSave({ ...task, recurrence });
    onClose();
  };

  const toggleWeeklyDay = (dayIndex) => {
    if (weeklyDays.includes(dayIndex)) {
      setWeeklyDays(weeklyDays.filter(d => d !== dayIndex));
    } else {
      setWeeklyDays([...weeklyDays, dayIndex]);
    }
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">繰り返し設定</h2>
        <div className="mb-4">
          <label htmlFor="recurrence-type" className="block mb-2 font-semibold">繰り返しの種類:</label>
          <select
            id="recurrence-type"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="none">なし</option>
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
          </select>
        </div>

        {recurrenceType === 'weekly' && (
          <div id="weekly-options" className="mb-4">
            <label className="block mb-2 font-semibold">曜日:</label>
            <div className="flex justify-center gap-1 weekday-selector">
              {weekdays.map((day, index) => (
                <span
                  key={index}
                  onClick={() => toggleWeeklyDay(index)}
                  className={`cursor-pointer p-2 w-10 h-10 flex items-center justify-center rounded-full ${weeklyDays.includes(index) ? 'bg-main-blue text-white' : 'bg-gray-200'}`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}

        {recurrenceType === 'monthly' && (
          <div id="monthly-options" className="mb-4">
            <label htmlFor="monthly-day" className="block mb-2 font-semibold">日付:</label>
            <input
              type="number"
              id="monthly-day"
              min="1"
              max="31"
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="例: 15"
            />
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300">
            キャンセル
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded text-white bg-main-blue hover:bg-dark-blue">
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RecurrenceModal;

