// src/modules/api.js

const HOLIDAY_API_ERROR_MESSAGE = '祝日APIの取得に失敗しました。オフラインの場合、祝日でもタスクが生成される可能性があります。';

const saveHolidaysToCache = (holidays) => {
    const cacheData = {
        timestamp: new Date().toISOString(),
        holidays: holidays,
    };
    localStorage.setItem('holidayCache', JSON.stringify(cacheData));
};

const loadHolidaysFromCache = () => {
    const cacheString = localStorage.getItem('holidayCache');
    if (!cacheString) return null;

    try {
        const cacheData = JSON.parse(cacheString);
        // Optional: Add cache expiration logic here
        // const cacheDate = new Date(cacheData.timestamp);
        // const now = new Date();
        // if ((now - cacheDate) > 24 * 60 * 60 * 1000) { // 24 hours
        //     return null;
        // }
        return cacheData.holidays;
    } catch (error) {
        console.error('Error parsing holiday cache:', error);
        return null;
    }
};

export const getHolidays = async () => {
    const cachedHolidays = loadHolidaysFromCache();
    if (cachedHolidays) {
        return cachedHolidays;
    }

    try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (response.ok) {
            const holidays = await response.json();
            saveHolidaysToCache(holidays);
            return holidays;
        } else {
            alert(HOLIDAY_API_ERROR_MESSAGE);
            return null;
        }
    } catch (error) {
        alert(HOLIDAY_API_ERROR_MESSAGE);
        return null;
    }
};
