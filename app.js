// app.js - Полный файл без import/export

// ============================================================
// Глобальные переменные
// ============================================================
const AppState = {
  currentView: 'hands',
  dateStart: null,
  dateEnd: null,
  expandedDay: null,
  widgetModes: {
    limit: 'average',
    hands: 'total',
    time: 'hours',
    result: 'eur'
  },
  theme: 'light',
  isProcessing: false,
  chart: null,
  dataManager: null
};

// ============================================================
// Инициализация приложения
// ============================================================
function initApp() {
  // Проверяем наличие библиотек
  if (typeof Chart === 'undefined') {
    showNotification('❌ Ошибка: Chart.js не загружен', 'error');
    return;
  }
  
  if (typeof JSZip === 'undefined') {
    showNotification('❌ Ошибка: JSZip не загружен', 'error');
    return;
  }
  
  // Создаем DataManager
  AppState.dataManager = new DataManager();
  
  // Загружаем настройки
  loadSettings();
  
  // Загружаем данные
  AppState.dataManager.loadHands();
  
  // Обновляем список игроков
  updatePlayerList();
  
  // Если есть сохраненный игрок, выбираем его
  if (AppState.dataManager.heroNick) {
    document.getElementById('playerSelect').value = AppState.dataManager.heroNick;
    AppState.dataManager.initAfterHeroSelection();
  }
  
  // Обновляем фильтр лимитов
  updateLimitFilter();
  
  // Настраиваем события
  setupEvents();
  
  // Обновляем UI
  updateUI();
  
  // Инициализируем график
  initChart();
  
  // Устанавливаем текущий год
  document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// ============================================================
// Загрузка настроек
// ============================================================
function loadSettings() {
  const settings = AppState.dataManager.settings;
  
  // Тема
  AppState.theme = settings.theme || 'light';
  applyTheme(AppState.theme);
  
  // Начало дня
  const dayStartHours = Math.floor(settings.dayStartHour);
  const dayStartMinutes = (settings.dayStartHour % 1) * 60;
  document.getElementById('dayStart').value = 
    `${String(dayStartHours).padStart(2, '0')}:${String(dayStartMinutes).padStart(2, '0')}`;
  
  // Разрыв сессий
  document.getElementById('sessionBreak').value = settings.sessionBreakMinutes;
  
  // Курсы валют
  if (settings.currencyRates) {
    document.getElementById('usdRate').value = settings.currencyRates.USD || 1.10;
    document.getElementById('eurRate').value = settings.currencyRates.EUR || 1.00;
    document.getElementById('rubRate').value = settings.currencyRates.RUB || 90.00;
  }
  
  // Режимы виджетов
  if (settings.widgetModes) {
    AppState.widgetModes = settings.widgetModes;
  }
}

// ============================================================
// Применение темы
// ============================================================
function applyTheme(theme) {
  AppState.theme = theme;
  document.getElementById('app').className = 'app ' + theme + '-theme';
}

// ============================================================
// Обновление списка игроков
// ============================================================
function updatePlayerList() {
  const nicks = AppState.dataManager.getAllNicks();
  const select = document.getElementById('playerSelect');
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Выберите игрока</option>';
  
  for (const nick of nicks) {
    const option = document.createElement('option');
    option.value = nick;
    option.textContent = nick;
    select.appendChild(option);
  }
  
  if (currentValue && nicks.includes(currentValue)) {
    select.value = currentValue;
  }
}

// ============================================================
// Обновление фильтра лимитов
// ============================================================
function updateLimitFilter() {
  const select = document.getElementById('limitFilter');
  const currentValue = select.value;
  
  const limits = new Set();
  for (const hand of AppState.dataManager.hands) {
    limits.add(`NL${hand.limit}`);
  }
  
  select.innerHTML = '<option value="all">Все лимиты</option>';
  
  for (const limit of limits) {
    const option = document.createElement('option');
    option.value = limit;
    option.textContent = limit;
    select.appendChild(option);
  }
  
  if (currentValue && limits.has(currentValue)) {
    select.value = currentValue;
  }
}

// ============================================================
// Настройка событий
// ============================================================
function setupEvents() {
  // ===== Выбор игрока =====
  document.getElementById('playerSelect').addEventListener('change', function() {
    const nick = this.value;
    AppState.dataManager.setHero(nick, AppState.dataManager.aliases);
    updateUI();
    updateChart();
  });
  
  // ===== Алиасы =====
  document.getElementById('aliasBtn').addEventListener('click', function() {
    document.getElementById('aliasInput').value = (AppState.dataManager.aliases || []).join(', ');
    openModal('aliasModal');
  });
  
  document.getElementById('saveAliases').addEventListener('click', function() {
    const input = document.getElementById('aliasInput').value;
    const aliases = input.split(',').map(s => s.trim()).filter(s => s);
    AppState.dataManager.aliases = aliases;
    AppState.dataManager.recalculateStats();
    updateUI();
    updateChart();
    closeModal('aliasModal');
  });
  
  document.getElementById('cancelAliases').addEventListener('click', function() {
    closeModal('aliasModal');
  });
  
  document.getElementById('aliasModalClose').addEventListener('click', function() {
    closeModal('aliasModal');
  });
  
  // ===== Импорт =====
  document.getElementById('importBtn').addEventListener('click', function() {
    openModal('importModal');
  });
  
  document.getElementById('importModalClose').addEventListener('click', function() {
    closeModal('importModal');
  });
  
  setupDropZone();
  
  document.getElementById('selectFilesBtn').addEventListener('click', function() {
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('selectFolderBtn').addEventListener('click', function() {
    document.getElementById('folderInput').click();
  });
  
  document.getElementById('fileInput').addEventListener('change', function(e) {
    handleFiles(e.target.files);
    this.value = '';
  });
  
  document.getElementById('folderInput').addEventListener('change', function(e) {
    handleFiles(e.target.files);
    this.value = '';
  });
  
  // ===== Сброс =====
  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('Вы уверены, что хотите удалить все данные?')) {
      AppState.dataManager.clearAll();
      updateUI();
      updateChart();
      updatePlayerList();
      updateLimitFilter();
      document.getElementById('playerSelect').value = '';
    }
  });
  
  // ===== Виджеты =====
  document.querySelectorAll('.widget').forEach(function(widget) {
    widget.addEventListener('click', function() {
      const type = this.dataset.widget;
      toggleWidgetMode(type);
    });
  });
  
  // ===== График =====
  document.querySelectorAll('.chart-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      AppState.currentView = this.dataset.mode;
      updateChart();
    });
  });
  
  document.getElementById('dateStart').addEventListener('change', function() {
    AppState.dateStart = this.value;
    updateChart();
  });
  
  document.getElementById('dateEnd').addEventListener('change', function() {
    AppState.dateEnd = this.value;
    updateChart();
  });
  
  document.getElementById('clearDateFilter').addEventListener('click', function() {
    AppState.dateStart = null;
    AppState.dateEnd = null;
    document.getElementById('dateStart').value = '';
    document.getElementById('dateEnd').value = '';
    updateChart();
  });
  
  // ===== Настройки нижней панели =====
  document.getElementById('dayStart').addEventListener('change', function() {
    const [hours, minutes] = this.value.split(':').map(Number);
    AppState.dataManager.updateSettings({
      dayStartHour: hours + minutes / 60
    });
    updateUI();
    updateDayList();
  });
  
  document.getElementById('sessionBreak').addEventListener('change', function() {
    const minutes = parseInt(this.value) || 5;
    AppState.dataManager.updateSettings({
      sessionBreakMinutes: minutes
    });
    updateDayList();
  });
  
  // ===== Курсы валют =====
  document.getElementById('updateRatesBtn').addEventListener('click', function() {
    fetchExchangeRates();
  });
  
  document.getElementById('usdRate').addEventListener('change', saveCurrencyRates);
  document.getElementById('eurRate').addEventListener('change', saveCurrencyRates);
  document.getElementById('rubRate').addEventListener('change', saveCurrencyRates);
  
  // ===== Закрытие модалок =====
  document.getElementById('overlay').addEventListener('click', function() {
    closeAllModals();
  });
  
  // ===== Клавиатура =====
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ============================================================
// Drop Zone
// ============================================================
function setupDropZone() {
  const zone = document.getElementById('dropZone');
  
  ['dragenter', 'dragover'].forEach(function(event) {
    zone.addEventListener(event, function(e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
  });
  
  ['dragleave', 'drop'].forEach(function(event) {
    zone.addEventListener(event, function(e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });
  
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const files = [];
    
    for (const item of items) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      
      if (entry) {
        if (entry.isDirectory) {
          traverseDirectory(entry, files);
        } else if (entry.isFile) {
          entry.file(function(file) {
            files.push(file);
            if (files.length === items.length) {
              handleFiles(files);
            }
          });
        }
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    
    if (files.length > 0) {
      handleFiles(files);
    }
  });
}

function traverseDirectory(entry, files) {
  const reader = entry.createReader();
  
  reader.readEntries(function(entries) {
    for (const childEntry of entries) {
      if (childEntry.isDirectory) {
        traverseDirectory(childEntry, files);
      } else if (childEntry.isFile) {
        childEntry.file(function(file) {
          files.push(file);
        });
      }
    }
  });
}

// ============================================================
// Обработка файлов
// ============================================================
async function handleFiles(fileList) {
  if (AppState.isProcessing) {
    showNotification('⏳ Идет обработка, подождите...', 'warning');
    return;
  }
  
  AppState.isProcessing = true;
  const files = Array.from(fileList);
  
  const xmlFiles = [];
  const archives = [];
  
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xml') {
      xmlFiles.push(file);
    } else if (ext === 'zip' || ext === 'rar') {
      archives.push(file);
    }
  }
  
  if (xmlFiles.length === 0 && archives.length === 0) {
    showNotification('Не найдено файлов для обработки (.xml, .zip, .rar)', 'warning');
    AppState.isProcessing = false;
    return;
  }
  
  showProgress();
  updateProgress('extracting', 'Распаковка архивов...', 0);
  
  let extractedFiles = [];
  let totalFiles = xmlFiles.length;
  
  for (const archive of archives) {
    try {
      const extracted = await extractArchive(archive);
      extractedFiles = extractedFiles.concat(extracted);
      totalFiles += extracted.length;
    } catch (error) {
      console.error('Error extracting archive:', error);
      showNotification('Ошибка распаковки: ' + archive.name, 'error');
    }
  }
  
  const allFiles = xmlFiles.concat(extractedFiles);
  updateProgress('parsing', 'Обработка файлов...', 0, allFiles.length);
  
  const allHands = [];
  let processed = 0;
  
  for (const file of allFiles) {
    try {
      const content = await file.text();
      const hands = parseXMLFile(content, AppState.dataManager.heroNick);
      if (hands && hands.length > 0) {
        allHands.push.apply(allHands, hands);
      }
    } catch (error) {
      console.error('Error parsing file:', file.name, error);
    }
    
    processed++;
    const progress = (processed / allFiles.length) * 100;
    updateProgress('parsing', 'Обработка файлов...', progress, allFiles.length, processed);
  }
  
  updateProgress('saving', 'Сохранение данных...', 100);
  
  const result = AppState.dataManager.addHands(allHands);
  document.getElementById('totalHandsFound').textContent = allHands.length;
  document.getElementById('newHandsAdded').textContent = result.added;
  document.getElementById('duplicateHandsSkipped').textContent = result.duplicates;
  
  hideProgress();
  AppState.isProcessing = false;
  
  if (result.added > 0) {
    showNotification('✅ Добавлено ' + result.added + ' новых рук (' + result.duplicates + ' пропущено дублей)', 'success');
    updateUI();
    updateChart();
    updatePlayerList();
    updateLimitFilter();
  } else {
    showNotification('ℹ️ Новых рук не найдено (' + result.duplicates + ' уже загружены)', 'info');
  }
  
  closeModal('importModal');
}

async function extractArchive(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const files = [];
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.name.endsWith('.xml') && !zipEntry.dir) {
        const content = await zipEntry.async('string');
        const extractedFile = new File([content], zipEntry.name, { type: 'text/xml' });
        files.push(extractedFile);
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error extracting archive:', error);
    return [];
  }
}

// ============================================================
// Прогресс-бар
// ============================================================
function showProgress() {
  document.getElementById('progressContainer').classList.remove('hidden');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressPercentage').textContent = '0%';
  document.getElementById('processedFiles').textContent = '0';
  document.getElementById('totalFiles').textContent = '0';
  document.getElementById('totalHandsFound').textContent = '0';
  document.getElementById('newHandsAdded').textContent = '0';
  document.getElementById('duplicateHandsSkipped').textContent = '0';
}

function updateProgress(stage, message, percent, total, processed) {
  const stageMap = {
    'extracting': '📦 Распаковка архивов...',
    'parsing': '📄 Обработка файлов...',
    'saving': '💾 Сохранение данных...'
  };
  
  document.getElementById('progressStage').textContent = message || stageMap[stage] || stage;
  document.getElementById('progressFill').style.width = Math.min(percent, 100) + '%';
  document.getElementById('progressPercentage').textContent = Math.round(Math.min(percent, 100)) + '%';
  
  if (total > 0) {
    document.getElementById('processedFiles').textContent = processed;
    document.getElementById('totalFiles').textContent = total;
  }
}

function hideProgress() {
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('progressFill').style.width = '0%';
}

// ============================================================
// Модалки
// ============================================================
function openModal(id) {
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(function(m) {
    m.classList.add('hidden');
  });
  document.getElementById('overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ============================================================
// UI Обновление
// ============================================================
function updateUI() {
  const stats = AppState.dataManager.getStats();
  updateWidgets(stats);
  updateDayList();
}

function updateWidgets(stats) {
  const widgets = AppState.widgetModes;
  const currencySymbol = getCurrencySymbol();
  
  // Лимит
  if (widgets.limit === 'average') {
    document.getElementById('avgLimit').textContent = 'NL' + (stats.averageLimit || 0);
  } else {
    document.getElementById('avgLimit').textContent = stats.favoriteLimit || 'NL0';
  }
  document.getElementById('favoriteLimit').textContent = 'Любимый: ' + (stats.favoriteLimit || 'NL0');
  
  // Раздачи
  const totalHands = stats.totalHands || 0;
  document.getElementById('totalHands').textContent = totalHands;
  
  if (widgets.hands === 'total') {
    document.getElementById('handsPerHour').textContent = totalHands + ' всего';
  } else if (widgets.hands === 'perHour') {
    const hours = (stats.totalTime || 0) / 3600;
    const perHour = hours > 0 ? Math.round(totalHands / hours) : 0;
    document.getElementById('handsPerHour').textContent = perHour + '/час';
  } else {
    const days = Object.keys(stats.days || {}).length || 1;
    const perDay = Math.round(totalHands / days);
    document.getElementById('handsPerHour').textContent = perDay + '/день';
  }
  
  // Время
  if (widgets.time === 'hours') {
    document.getElementById('totalTime').textContent = formatTime(stats.totalTime || 0);
  } else {
    document.getElementById('totalTime').textContent = formatMinutes(stats.totalTime || 0);
  }
  document.getElementById('totalTimeMinutes').textContent = formatMinutes(stats.totalTime || 0);
  
  // Результат
  const result = stats.netResult || 0;
  document.getElementById('netResult').textContent = currencySymbol + result.toFixed(2);
  document.getElementById('netResult').className = 'widget-value ' + (result >= 0 ? 'positive' : 'negative');
  
  const wonHands = stats.totalWon || 0;
  document.getElementById('resultDetails').textContent = wonHands + ' рук выиграно';
}

function updateDayList() {
  const days = AppState.dataManager.getDays({
    dayStartHour: AppState.dataManager.settings.dayStartHour,
    sessionBreakMinutes: AppState.dataManager.settings.sessionBreakMinutes
  });
  
  const container = document.getElementById('dayList');
  const currencySymbol = getCurrencySymbol();
  
  if (days.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет данных для отображения</div>';
    return;
  }
  
  let html = '';
  
  for (const day of days) {
    const isExpanded = AppState.expandedDay === day.day;
    const resultClass = day.netResult >= 0 ? 'positive' : 'negative';
    
    html += '<div class="day-item">';
    html += '<div class="day-header" data-day="' + day.day + '">';
    html += '<span class="day-date">' + formatDate(day.day) + '</span>';
    html += '<div class="day-stats">';
    html += '<span class="hands-count">' + day.totalHands + ' рук</span>';
    html += '<span class="time">' + formatTime(day.totalTime) + '</span>';
    html += '<span class="result ' + resultClass + '">' + currencySymbol + day.netResult.toFixed(2) + '</span>';
    html += '</div></div>';
    
    html += '<div class="day-sessions' + (isExpanded ? '' : ' hidden') + '" id="sessions-' + day.day + '">';
    
    if (isExpanded) {
      for (const session of day.sessions) {
        const sessionClass = session.netResult >= 0 ? 'positive' : 'negative';
        html += '<div class="session-item">';
        html += '<span class="session-time">' + formatTimeSession(session.startTime, session.endTime) + '</span>';
        html += '<span class="session-hands">' + session.handsCount + ' рук</span>';
        html += '<span class="session-result ' + sessionClass + '">' + currencySymbol + session.netResult.toFixed(2) + '</span>';
        html += '</div>';
      }
    }
    
    html += '</div></div>';
  }
  
  container.innerHTML = html;
  
  // Навешиваем события на заголовки дней
  container.querySelectorAll('.day-header').forEach(function(header) {
    header.addEventListener('click', function() {
      const dayKey = this.dataset.day;
      toggleDay(dayKey);
    });
  });
}

function toggleDay(dayKey) {
  if (AppState.expandedDay === dayKey) {
    AppState.expandedDay = null;
  } else {
    AppState.expandedDay = dayKey;
  }
  updateDayList();
}

// ============================================================
// Виджеты переключение
// ============================================================
function toggleWidgetMode(type) {
  const modes = {
    limit: ['average', 'favorite'],
    hands: ['total', 'perHour', 'perDay'],
    time: ['hours', 'minutes'],
    result: ['eur', 'usd', 'rub']
  };
  
  const current = AppState.widgetModes[type];
  const modeList = modes[type];
  const currentIndex = modeList.indexOf(current);
  const nextIndex = (currentIndex + 1) % modeList.length;
  AppState.widgetModes[type] = modeList[nextIndex];
  
  AppState.dataManager.updateSettings({ widgetModes: AppState.widgetModes });
  updateUI();
}

// ============================================================
// График
// ============================================================
function initChart() {
  const ctx = document.getElementById('chartCanvas').getContext('2d');
  
  AppState.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Результат',
        data: [],
        borderColor: '#4299e1',
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed.y.toFixed(2) + ' €';
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
  
  updateChart();
}

function updateChart() {
  if (!AppState.chart) return;
  
  const hands = AppState.dataManager.hands;
  const filteredHands = filterHands(hands);
  
  if (filteredHands.length === 0) {
    AppState.chart.data.labels = [];
    AppState.chart.data.datasets[0].data = [];
    AppState.chart.update();
    return;
  }
  
  if (AppState.currentView === 'hands') {
    updateChartByHands(filteredHands);
  } else {
    updateChartByDays(filteredHands);
  }
}

function filterHands(hands) {
  let filtered = hands.slice();
  
  if (AppState.dateStart) {
    const start = new Date(AppState.dateStart);
    filtered = filtered.filter(function(h) {
      return new Date(h.startDate) >= start;
    });
  }
  
  if (AppState.dateEnd) {
    const end = new Date(AppState.dateEnd);
    end.setHours(23, 59, 59);
    filtered = filtered.filter(function(h) {
      return new Date(h.startDate) <= end;
    });
  }
  
  const selectedLimits = document.getElementById('limitFilter').value;
  if (selectedLimits && selectedLimits !== 'all') {
    filtered = filtered.filter(function(h) {
      return 'NL' + h.limit === selectedLimits;
    });
  }
  
  const hero = document.getElementById('playerSelect').value;
  if (hero) {
    const aliases = AppState.dataManager.aliases || [];
    filtered = filtered.filter(function(h) {
      return h.heroName === hero || aliases.indexOf(h.heroName) !== -1;
    });
  }
  
  return filtered;
}

function updateChartByHands(hands) {
  const chunkSize = Math.max(1, Math.floor(hands.length / 10));
  const labels = [];
  const data = [];
  let cumulative = 0;
  
  for (let i = 0; i < hands.length; i += chunkSize) {
    const chunk = hands.slice(i, i + chunkSize);
    const chunkResult = chunk.reduce(function(sum, h) {
      return sum + h.result;
    }, 0);
    cumulative += chunkResult;
    
    labels.push('#' + (i + 1));
    data.push(cumulative);
  }
  
  AppState.chart.data.labels = labels;
  AppState.chart.data.datasets[0].data = data;
  AppState.chart.update();
}

function updateChartByDays(hands) {
  const days = {};
  
  for (const hand of hands) {
    const dayKey = hand.startDate.toISOString().split('T')[0];
    if (!days[dayKey]) {
      days[dayKey] = { result: 0, count: 0 };
    }
    days[dayKey].result += hand.result;
    days[dayKey].count++;
  }
  
  const sortedDays = Object.keys(days).sort();
  const labels = sortedDays.map(function(d) {
    return formatDate(d);
  });
  const data = sortedDays.map(function(d) {
    return days[d].result;
  });
  
  AppState.chart.data.labels = labels;
  AppState.chart.data.datasets[0].data = data;
  AppState.chart.update();
}

// ============================================================
// Валюты
// ============================================================
function getCurrencySymbol() {
  const mode = AppState.widgetModes.result;
  const symbols = {
    eur: '€',
    usd: '$',
    rub: '₽'
  };
  return symbols[mode] || '€';
}

function saveCurrencyRates() {
  const rates = {
    USD: parseFloat(document.getElementById('usdRate').value) || 1.10,
    EUR: parseFloat(document.getElementById('eurRate').value) || 1.00,
    RUB: parseFloat(document.getElementById('rubRate').value) || 90.00
  };
  
  AppState.dataManager.updateSettings({ currencyRates: rates });
}

async function fetchExchangeRates() {
  const btn = document.getElementById('updateRatesBtn');
  btn.textContent = 'Загрузка...';
  btn.disabled = true;
  
  try {
    const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await response.json();
    
    if (data.Valute) {
      const usd = data.Valute.USD?.Value || 1.10;
      const eur = data.Valute.EUR?.Value || 1.00;
      
      document.getElementById('usdRate').value = (usd / eur).toFixed(4);
      document.getElementById('eurRate').value = 1.00;
      document.getElementById('rubRate').value = (eur * 100).toFixed(2);
      
      saveCurrencyRates();
      showNotification('✅ Курсы валют обновлены', 'success');
    }
  } catch (error) {
    console.error('Error fetching rates:', error);
    showNotification('❌ Ошибка получения курсов', 'error');
  } finally {
    btn.textContent = 'Обновить курсы';
    btn.disabled = false;
  }
}

// ============================================================
// Утилиты (из time.js)
// ============================================================
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

// ============================================================
// Уведомления
// ============================================================
function showNotification(message, type) {
  type = type || 'info';
  const colors = {
    success: '#48bb78',
    error: '#fc8181',
    warning: '#ecc94b',
    info: '#4299e1'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = 
    'position:fixed;bottom:20px;right:20px;padding:12px 20px;' +
    'background:' + (colors[type] || colors.info) + ';color:white;' +
    'border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);' +
    'z-index:2000;font-size:14px;max-width:400px;' +
    'animation:bounceIn 0.3s ease;cursor:pointer;';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(function() {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(function() {
      notification.remove();
    }, 500);
  }, 3000);
  
  notification.addEventListener('click', function() {
    notification.remove();
  });
}

// ============================================================
// Запуск приложения
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});