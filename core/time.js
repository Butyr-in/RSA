// core/time.js
// ============================================================
// Работа со временем
// ============================================================

function parseDateTime(dateStr) {
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const timePart = parts[1];

    const dateParts = datePart.split('-').map(Number);
    const timeParts = timePart.split(':').map(Number);

    return new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1], timeParts[2]);
}

function formatTime(seconds) {
    if (seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }
    return minutes + ':' + String(secs).padStart(2, '0');
}

function formatMinutes(seconds) {
    const minutes = seconds / 60;
    return Math.round(minutes * 10) / 10 + ' мин';
}

function getDayKey(date, dayStartHour) {
    dayStartHour = dayStartHour || 6;
    const d = new Date(date);
    const hours = d.getHours();
    if (hours < dayStartHour) {
        d.setDate(d.getDate() - 1);
    }
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

function formatTimeSession(start, end) {
    const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return startStr + ' - ' + endStr;
}