// core/utils/time.js
// ============================================================
// Работа со временем
// ============================================================

function parseDateTime(dateStr) {
  // Вход: "08-28-2026 02:02:53"
  // Выход: Date объект
  var parts = dateStr.split(' ');
  var datePart = parts[0];
  var timePart = parts[1];
  
  var dateParts = datePart.split('-').map(Number);
  var timeParts = timePart.split(':').map(Number);
  
  return new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1], timeParts[2]);
}

function getDayKey(date, dayStartHour) {
  dayStartHour = dayStartHour || 6;
  var d = new Date(date);
  var hours = d.getHours();
  if (hours < dayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function formatTime(seconds) {
  if (seconds < 0) return '0:00';
  
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }
  return minutes + ':' + String(secs).padStart(2, '0');
}

function formatMinutes(seconds) {
  var minutes = seconds / 60;
  return Math.round(minutes * 10) / 10 + ' мин';
}

function getSessionBreak(date1, date2) {
  return Math.abs(date2.getTime() - date1.getTime());
}

function isSameDay(date1, date2, dayStartHour) {
  dayStartHour = dayStartHour || 6;
  return getDayKey(date1, dayStartHour) === getDayKey(date2, dayStartHour);
}