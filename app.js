// app.js
// ============================================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
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
        efficiency: 'bb100',
        result: 'eur'
    },
    theme: 'light',
    isProcessing: false,
    chart: null,
    dataManager: null
};

// Инициализация приложения
async function initApp() {
    console.log('🚀 Poker Hand Analyzer starting...');

    if (typeof Chart === 'undefined') {
        showNotification('❌ Ошибка: Chart.js не загружен', 'error');
        console.error('Chart.js не загружен!');
        return;
    }

    if (typeof JSZip === 'undefined') {
        showNotification('❌ Ошибка: JSZip не загружен', 'error');
        console.error('JSZip не загружен!');
        return;
    }

    try {
        AppState.dataManager = new DataManager();
        loadSettings();
        
        const loaded = await AppState.dataManager.loadHands();
        if (!loaded) {
            console.warn('⚠️ Не удалось загрузить руки из IndexedDB, продолжаем с пустой базой');
        }
        
        updatePlayerList();

        if (AppState.dataManager.heroNick) {
            document.getElementById('playerSelect').value = AppState.dataManager.heroNick;
            AppState.dataManager.initAfterHeroSelection();
        }

        updateLimitFilter();
        setupEvents();
        updateUI();
        initChart();

        try {
            const count = await AppState.dataManager.getHandsCount();
            console.log(`📊 Всего рук в БД: ${count}`);
        } catch (e) {
            console.warn('Не удалось получить количество рук:', e);
        }

        document.getElementById('currentYear').textContent = new Date().getFullYear();
        console.log('✅ Poker Hand Analyzer initialized successfully!');
        showNotification('✅ Приложение готово к работе', 'success');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showNotification('❌ Ошибка инициализации приложения. Проверьте консоль.', 'error');
        
        try {
            updateUI();
        } catch (e) {
            console.error('Не удалось обновить UI:', e);
        }
    }
}

// Загрузка настроек
function loadSettings() {
    const settings = AppState.dataManager.settings;

    AppState.theme = settings.theme || 'light';
    applyTheme(AppState.theme);
    updateThemeIcon(); // Добавляем обновление иконки

    const dayStartHours = Math.floor(settings.dayStartHour);
    const dayStartMinutes = (settings.dayStartHour % 1) * 60;
    const dayStartEl = document.getElementById('dayStart');
    if (dayStartEl) {
        dayStartEl.value = String(dayStartHours).padStart(2, '0') + ':' + String(dayStartMinutes).padStart(2, '0');
    }

    const sessionBreakEl = document.getElementById('sessionBreak');
    if (sessionBreakEl) {
        sessionBreakEl.value = settings.sessionBreakMinutes;
    }

    if (settings.currencyRates) {
        const usdRate = document.getElementById('usdRate');
        const rubRate = document.getElementById('rubRate');
        if (usdRate) usdRate.value = settings.currencyRates.USD || 1.10;
        if (rubRate) rubRate.value = settings.currencyRates.RUB || 90.00;
    }

    if (settings.widgetModes) {
        AppState.widgetModes = settings.widgetModes;
    }
}

// Применение темы
function applyTheme(theme) {
    AppState.theme = theme;
    const body = document.body;
    body.className = theme + '-theme';
    
    const app = document.getElementById('app');
    if (app) {
        app.className = 'app';
    }
}

// Переключение темы
function toggleTheme() {
    const themes = ['light', 'dark', 'beige'];
    const currentIndex = themes.indexOf(AppState.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    AppState.theme = nextTheme;
    applyTheme(nextTheme);
    
    // Сохраняем в настройках
    AppState.dataManager.updateSettings({ theme: nextTheme });
    
    // Обновляем иконку
    updateThemeIcon();
    
    showNotification('🎨 Тема: ' + getThemeName(nextTheme), 'info');
}

// Получение названия темы
function getThemeName(theme) {
    const names = {
        light: 'Светлая',
        dark: 'Тёмная',
        beige: 'Бежевая'
    };
    return names[theme] || theme;
}

// Обновление иконки темы
// Обновление иконки темы
function updateThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    
    const icons = {
        light: '☀️',
        dark: '🌙',
        beige: '💡'
    };
    
    btn.textContent = icons[AppState.theme] || icons.light;
}

// Обновление списка игроков
function updatePlayerList() {
    const nicks = AppState.dataManager.getAllNicks();
    const select = document.getElementById('playerSelect');
    const currentValue = AppState.dataManager.heroNick || select.value; // Используем сохранённого игрока

    select.innerHTML = '<option value="">Выберите игрока</option>';

    for (const nick of nicks) {
        const option = document.createElement('option');
        option.value = nick;
        option.textContent = nick;
        select.appendChild(option);
    }

    // Если есть сохранённый игрок, восстанавливаем его
    if (AppState.dataManager.heroNick) {
        select.value = AppState.dataManager.heroNick;
    } else if (currentValue && nicks.includes(currentValue)) {
        select.value = currentValue;
    }
}

// Обновление фильтра лимитов (чекбоксы)
function updateLimitFilter() {
    const container = document.getElementById('limitFilter');

    const limits = new Set();
    for (const hand of AppState.dataManager.hands) {
        limits.add('NL' + hand.limit);
    }

    // Сортируем лимиты по возрастанию
    const sortedLimits = Array.from(limits).sort((a, b) => {
        return parseInt(a.replace('NL', '')) - parseInt(b.replace('NL', ''));
    });

    // Загружаем сохранённые лимиты из localStorage
    let selectedLimits = new Set();
    let allSelected = true; // По умолчанию выбраны все
    
    try {
        const saved = localStorage.getItem('pokerSelectedLimits');
        const savedAllSelected = localStorage.getItem('pokerAllSelected');
        
        if (savedAllSelected !== null) {
            allSelected = savedAllSelected === 'true';
        }
        
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                selectedLimits = new Set(parsed);
            }
        }
    } catch (e) {
        console.error('Error loading selected limits:', e);
    }

    // Перестраиваем чекбоксы
    container.innerHTML = '';
    
    // Добавляем чекбокс "Все"
    const allLabel = document.createElement('label');
    allLabel.className = 'checkbox-label';
    allLabel.innerHTML = '<input type="checkbox" value="all"> Все';
    container.appendChild(allLabel);
    
    // Добавляем чекбоксы для каждого лимита
    for (const limit of sortedLimits) {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `<input type="checkbox" value="${limit}"> ${limit}`;
        container.appendChild(label);
    }

    // Применяем сохранённое состояние
    const allCheckbox = container.querySelector('input[value="all"]');
    
    if (allSelected) {
        // Выбраны все
        allCheckbox.checked = true;
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.value !== 'all') cb.checked = true;
        });
    } else {
        // Выбраны конкретные лимиты или ничего
        allCheckbox.checked = false;
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (selectedLimits.has(cb.value)) {
                cb.checked = true;
            }
        });
    }
}

// ============================================================
// СОБЫТИЯ
// ============================================================

function setupEvents() {
    // Обработчик выбора игрока
    document.getElementById('playerSelect').addEventListener('change', function() {
        const nick = this.value;
        AppState.dataManager.setHero(nick, AppState.dataManager.aliases);
        updateUI();
        updateChart();
    });

    // Обработчик кнопки алиасов
    document.getElementById('aliasBtn').addEventListener('click', function() {
        document.getElementById('aliasInput').value = (AppState.dataManager.aliases || []).join(', ');
        openModal('aliasModal');
    });

    // Обработчик сохранения алиасов
    document.getElementById('saveAliases').addEventListener('click', function() {
        const input = document.getElementById('aliasInput').value;
        const aliases = input.split(',').map(s => s.trim()).filter(s => s);
        AppState.dataManager.aliases = aliases;
        AppState.dataManager.recalculateStats();
        updateUI();
        updateChart();
        closeModal('aliasModal');
    });

    // Обработчик отмены алиасов
    document.getElementById('cancelAliases').addEventListener('click', function() {
        closeModal('aliasModal');
    });

    // Обработчик закрытия модалки алиасов
    document.getElementById('aliasModalClose').addEventListener('click', function() {
        closeModal('aliasModal');
    });

    // Обработчик переключения темы
    document.getElementById('themeToggle').addEventListener('click', function() {
        toggleTheme();
    });

    // Обработчик кнопки импорта
    document.getElementById('importBtn').addEventListener('click', function() {
        openModal('importModal');
    });

    // Обработчик закрытия модалки импорта
    document.getElementById('importModalClose').addEventListener('click', function() {
        closeModal('importModal');
    });

    // Настройка зоны перетаскивания
    setupDropZone();

    // Обработчик кнопки выбора файлов
    document.getElementById('selectFilesBtn').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    // Обработчик кнопки выбора папки
    document.getElementById('selectFolderBtn').addEventListener('click', function() {
        document.getElementById('folderInput').click();
    });

    // Обработчик изменения файлов
    document.getElementById('fileInput').addEventListener('change', function(e) {
        handleFiles(e.target.files);
        this.value = '';
    });

    // Обработчик изменения папки
    document.getElementById('folderInput').addEventListener('change', function(e) {
        handleFiles(e.target.files);
        this.value = '';
    });

// Обработчик кнопки сброса
document.getElementById('resetBtn').addEventListener('click', async function() {
    if (confirm('Вы уверены, что хотите удалить все данные?')) {
        await AppState.dataManager.clearAll();
        
        localStorage.removeItem('pokerSelectedLimits');
        localStorage.removeItem('pokerAllSelected');
        
        updateUI();
        updateChart();
        updatePlayerList(); // ← Этот метод перезаписывает селект
        updateLimitFilter();
        
        // Восстанавливаем игрока ПОСЛЕ обновления списка
        if (AppState.dataManager.heroNick) {
            document.getElementById('playerSelect').value = AppState.dataManager.heroNick;
            AppState.dataManager.initAfterHeroSelection();
        }
        
        showNotification('✅ Раздачи удалены', 'success');
    }
});

    // ОБРАБОТЧИК ИЗМЕНЕНИЯ ЧЕКБОКСОВ ЛИМИТОВ (ДОБАВЛЕН)
    document.getElementById('limitFilter').addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            handleLimitFilterChange(e);
        }
    });

    // Обработчики виджетов (переключение режимов)
    document.querySelectorAll('.widget').forEach(function(widget) {
        widget.addEventListener('click', function() {
            const type = this.dataset.widget;
            toggleWidgetMode(type);
        });
    });

    // Обработчики кнопок графика
    document.querySelectorAll('.chart-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            AppState.currentView = this.dataset.mode;
            updateChart();
        });
    });

    // Обработчик изменения даты начала
    document.getElementById('dateStart').addEventListener('change', function() {
        AppState.dateStart = this.value;
        updateChart();
    });

    // Обработчик изменения даты окончания
    document.getElementById('dateEnd').addEventListener('change', function() {
        AppState.dateEnd = this.value;
        updateChart();
    });

    // Обработчик очистки фильтра дат
    document.getElementById('clearDateFilter').addEventListener('click', function() {
        AppState.dateStart = null;
        AppState.dateEnd = null;
        document.getElementById('dateStart').value = '';
        document.getElementById('dateEnd').value = '';
        updateChart();
    });

    // Обработчик изменения начала дня
    document.getElementById('dayStart').addEventListener('change', function() {
        const parts = this.value.split(':').map(Number);
        AppState.dataManager.updateSettings({
            dayStartHour: parts[0] + parts[1] / 60
        });
        updateUI();
        updateDayList();
    });

    // Обработчик изменения разрыва сессий
    document.getElementById('sessionBreak').addEventListener('change', function() {
        const minutes = parseInt(this.value) || 5;
        AppState.dataManager.updateSettings({
            sessionBreakMinutes: minutes
        });
        updateDayList();
    });

    // Обработчик кнопки обновления курсов
    document.getElementById('updateRatesBtn').addEventListener('click', function() {
        fetchExchangeRates();
    });

    // Обработчики изменения курсов валют
    document.getElementById('usdRate').addEventListener('change', saveCurrencyRates);
    document.getElementById('rubRate').addEventListener('change', saveCurrencyRates);

    // Обработчик клика по затемнению
    document.getElementById('overlay').addEventListener('click', function() {
        closeAllModals();
    });

    // Обработчик клавиши Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Обработка изменения чекбоксов лимитов
function handleLimitFilterChange(e) {
    const container = document.getElementById('limitFilter');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = container.querySelector('input[value="all"]');
    
    // Если нажали "Все"
    if (e.target.value === 'all') {
        if (allCheckbox.checked) {
            // Отмечаем все чекбоксы
            checkboxes.forEach(cb => {
                if (cb.value !== 'all') cb.checked = true;
            });
            // Сохраняем, что выбраны все
            localStorage.setItem('pokerAllSelected', 'true');
            localStorage.setItem('pokerSelectedLimits', '[]');
        } else {
            // Снимаем все чекбоксы
            checkboxes.forEach(cb => {
                if (cb.value !== 'all') cb.checked = false;
            });
            // Сохраняем, что ничего не выбрано
            localStorage.setItem('pokerAllSelected', 'false');
            localStorage.setItem('pokerSelectedLimits', '[]');
        }
    } else {
        // Если нажали на конкретный лимит
        const checkedSpecific = Array.from(checkboxes).filter(cb => 
            cb.value !== 'all' && cb.checked
        );
        
        if (checkedSpecific.length === 0) {
            // Если ничего не выбрано
            allCheckbox.checked = false;
            localStorage.setItem('pokerAllSelected', 'false');
            localStorage.setItem('pokerSelectedLimits', '[]');
        } else if (checkedSpecific.length === checkboxes.length - 1) {
            // Если выбраны все конкретные, отмечаем "Все"
            allCheckbox.checked = true;
            localStorage.setItem('pokerAllSelected', 'true');
            localStorage.setItem('pokerSelectedLimits', '[]');
        } else {
            // Иначе снимаем "Все" и сохраняем выбранные
            allCheckbox.checked = false;
            const selectedLimits = checkedSpecific.map(cb => cb.value);
            localStorage.setItem('pokerAllSelected', 'false');
            localStorage.setItem('pokerSelectedLimits', JSON.stringify(selectedLimits));
        }
    }
    
    updateUI(); // Обновляем виджеты и список дней
    updateChart(); // Обновляем график
}

function saveSelectedLimits() {
    const container = document.getElementById('limitFilter');
    const allCheckbox = container.querySelector('input[value="all"]');
    const selectedLimits = [];
    
    if (!allCheckbox.checked) {
        container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            if (cb.value !== 'all') {
                selectedLimits.push(cb.value);
            }
        });
    }
    
    try {
        localStorage.setItem('pokerSelectedLimits', JSON.stringify(selectedLimits));
    } catch (e) {
        console.error('Error saving selected limits:', e);
    }
}

// ============================================================
// DROP ZONE
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
        let totalItems = items.length;
        let processed = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

            if (entry) {
                if (entry.isDirectory) {
                    traverseDirectory(entry, files, function() {
                        processed++;
                        if (processed === totalItems) {
                            handleFiles(files);
                        }
                    });
                } else if (entry.isFile) {
                    entry.file(function(file) {
                        files.push(file);
                        processed++;
                        if (processed === totalItems) {
                            handleFiles(files);
                        }
                    });
                }
            } else {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
                processed++;
                if (processed === totalItems) {
                    handleFiles(files);
                }
            }
        }

        if (files.length > 0 && processed === totalItems) {
            handleFiles(files);
        }
    });
}

function traverseDirectory(entry, files, callback) {
    const reader = entry.createReader();

    reader.readEntries(function(entries) {
        const total = entries.length;
        let processed = 0;

        if (total === 0) {
            callback();
            return;
        }

        for (let i = 0; i < entries.length; i++) {
            const childEntry = entries[i];
            if (childEntry.isDirectory) {
                traverseDirectory(childEntry, files, function() {
                    processed++;
                    if (processed === total) {
                        callback();
                    }
                });
            } else if (childEntry.isFile) {
                childEntry.file(function(file) {
                    files.push(file);
                    processed++;
                    if (processed === total) {
                        callback();
                    }
                });
            }
        }
    });
}

// ============================================================
// ОБРАБОТКА ФАЙЛОВ
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

    const extractedFiles = [];
    let totalFiles = xmlFiles.length;

    for (const archive of archives) {
        try {
            const extracted = await extractArchive(archive);
            extractedFiles.push(...extracted);
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
    const heroNick = AppState.dataManager.heroNick || 'GNKTABACCO';

    for (const file of allFiles) {
        try {
            const content = await file.text();
            const hands = parseXMLFile(content, heroNick);
            if (hands && hands.length > 0) {
                allHands.push(...hands);
            }
        } catch (error) {
            console.error('Error parsing file:', file.name, error);
        }

        processed++;
        const progress = (processed / allFiles.length) * 100;
        updateProgress('parsing', 'Обработка файлов...', progress, allFiles.length, processed);
    }

    updateProgress('saving', 'Сохранение данных...', 100);

    const result = await AppState.dataManager.addHands(allHands);

    document.getElementById('totalHandsFound').textContent = allHands.length;
    document.getElementById('newHandsAdded').textContent = result.added;
    document.getElementById('duplicateHandsSkipped').textContent = result.duplicates;

    hideProgress();
    AppState.isProcessing = false;

    if (result.added > 0) {
        showNotification('✅ Добавлено ' + result.added + ' новых рук (' + result.duplicates + ' пропущено дублей)', 'success');
        
        updatePlayerList();
        if (!AppState.dataManager.heroNick) {
            showNotification('👤 Выберите игрока из списка', 'info');
        }
        
        updateUI();
        updateChart();
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

        for (const path in zip.files) {
            const zipEntry = zip.files[path];
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
// ПРОГРЕСС-БАР
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
// МОДАЛКИ
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
// UI ОБНОВЛЕНИЕ
// ============================================================

function updateUI() {
    const selectedLimits = getSelectedLimits();
    const stats = AppState.dataManager.getStats({ limits: selectedLimits });
    updateWidgets(stats);
    updateDayList(selectedLimits);
}

// Расчёт винрейта bb/100
function calculateBB100(stats) {
    if (!stats || stats.totalHands === 0) return 0;
    
    const bb = stats.averageLimit || 1;
    const hands = stats.totalHands;
    const netResult = stats.netResult || 0;
    
    // bb/100 = (результат / (лимит * руки)) * 100
    return (netResult / (bb * hands)) * 100;
}

// Расчёт дохода в час
function calculateHourlyIncome(stats) {
    if (!stats || stats.totalTime === 0) return 0;
    
    const netResult = stats.netResult || 0;
    const hours = stats.totalTime / 3600;
    
    return netResult / hours;
}

// ============================================================
// ОБНОВЛЕНИЕ ВИДЖЕТОВ
// ============================================================

function updateWidgets(stats) {
    const widgets = AppState.widgetModes;
    const currencySymbol = getCurrencySymbol();

    // ===== ЛИМИТ =====
    if (widgets.limit === 'average') {
        document.getElementById('avgLimit').textContent = 'NL' + (stats.averageLimit || 0);
        document.getElementById('favoriteLimit').textContent = 'Средний';
    } else {
        document.getElementById('avgLimit').textContent = stats.favoriteLimit || 'NL0';
        document.getElementById('favoriteLimit').textContent = 'Любимый';
    }

    // ===== РАЗДАЧИ =====
    const totalHands = stats.totalHands || 0;
    
    if (widgets.hands === 'total') {
        document.getElementById('totalHands').textContent = totalHands;
        document.getElementById('handsPerHour').textContent = 'Всего';
    } else if (widgets.hands === 'perHour') {
        const hours = (stats.totalTime || 0) / 3600;
        const perHour = hours > 0 ? Math.round(totalHands / hours) : 0;
        document.getElementById('totalHands').textContent = perHour;
        document.getElementById('handsPerHour').textContent = 'В час';
    } else {
        const days = Object.keys(stats.days || {}).length || 1;
        const perDay = Math.round(totalHands / days);
        document.getElementById('totalHands').textContent = perDay;
        document.getElementById('handsPerHour').textContent = 'В день';
    }

    // ===== ВРЕМЯ =====
    if (widgets.time === 'hours') {
        document.getElementById('totalTime').textContent = formatTime(stats.totalTime || 0);
        document.getElementById('totalTimeMinutes').textContent = 'Часы';
    } else {
        document.getElementById('totalTime').textContent = formatMinutes(stats.totalTime || 0);
        document.getElementById('totalTimeMinutes').textContent = 'Минуты';
    }

    // ===== ЭФФЕКТИВНОСТЬ =====
    const efficiencyValue = document.getElementById('efficiencyValue');
    const efficiencyDetails = document.getElementById('efficiencyDetails');
    
    if (widgets.efficiency === 'bb100') {
        const bb100 = calculateBB100(stats);
        efficiencyValue.textContent = bb100.toFixed(1) + ' bb/100';
        efficiencyValue.className = 'widget-value ' + (bb100 >= 0 ? 'positive' : 'negative');
        efficiencyDetails.textContent = 'Винрейт';
    } else {
        const hourly = calculateHourlyIncome(stats);
        efficiencyValue.textContent = currencySymbol + hourly.toFixed(2) + '/час';
        efficiencyValue.className = 'widget-value ' + (hourly >= 0 ? 'positive' : 'negative');
        efficiencyDetails.textContent = 'Доход в час';
    }

    // ===== ОБЩИЙ РЕЗУЛЬТАТ =====
    const result = stats.netResult || 0;
    document.getElementById('netResult').textContent = currencySymbol + result.toFixed(2);
    document.getElementById('netResult').className = 'widget-value ' + (result >= 0 ? 'positive' : 'negative');
    
    const wonHands = stats.totalWon || 0;
    const lostHands = stats.totalLost || 0;
    document.getElementById('resultDetails').textContent = wonHands + ' выиграно / ' + lostHands + ' проиграно';
}

function updateDayList(selectedLimits = []) {
    const days = AppState.dataManager.getDays({
        dayStartHour: AppState.dataManager.settings.dayStartHour,
        sessionBreakMinutes: AppState.dataManager.settings.sessionBreakMinutes,
        limits: selectedLimits
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
// ВИДЖЕТЫ ПЕРЕКЛЮЧЕНИЕ
// ============================================================

function toggleWidgetMode(type) {
    const modes = {
        limit: ['average', 'favorite'],
        hands: ['total', 'perDay', 'perHour'],
        time: ['hours', 'minutes'],
        efficiency: ['bb100', 'hourly'],
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
// ГРАФИК
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
    let filtered = [...hands];

    if (AppState.dateStart) {
        const start = new Date(AppState.dateStart);
        filtered = filtered.filter(h => new Date(h.startDate) >= start);
    }

    if (AppState.dateEnd) {
        const end = new Date(AppState.dateEnd);
        end.setHours(23, 59, 59);
        filtered = filtered.filter(h => new Date(h.startDate) <= end);
    }

    // Фильтрация по лимитам (чекбоксы)
    const limitContainer = document.getElementById('limitFilter');
    const allCheckbox = limitContainer.querySelector('input[value="all"]');
    
    // Если "Все" НЕ отмечено, фильтруем по выбранным лимитам
    if (!allCheckbox.checked) {
        const checkedLimits = Array.from(limitContainer.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value)
            .filter(v => v !== 'all');
        
        // Если есть выбранные лимиты, фильтруем по ним
        if (checkedLimits.length > 0) {
            filtered = filtered.filter(h => checkedLimits.includes('NL' + h.limit));
        } else {
            // Если ничего не выбрано - показываем пустой результат
            filtered = [];
        }
    }

    const hero = document.getElementById('playerSelect').value;
    if (hero) {
        const aliases = AppState.dataManager.aliases || [];
        filtered = filtered.filter(h => h.heroName === hero || aliases.includes(h.heroName));
    }

    return filtered;
}

function getSelectedLimits() {
    const limitContainer = document.getElementById('limitFilter');
    const allCheckbox = limitContainer.querySelector('input[value="all"]');
    
    // Если "Все" отмечено, возвращаем пустой массив (значит все лимиты)
    if (allCheckbox.checked) {
        return [];
    }
    
    // Иначе возвращаем выбранные лимиты
    return Array.from(limitContainer.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value)
        .filter(v => v !== 'all');
}

function updateChartByHands(hands) {
    const chunkSize = Math.max(1, Math.floor(hands.length / 10));
    const labels = [];
    const data = [];
    let cumulative = 0;

    for (let i = 0; i < hands.length; i += chunkSize) {
        const chunk = hands.slice(i, i + chunkSize);
        const chunkResult = chunk.reduce((sum, h) => sum + h.result, 0);
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
    const labels = sortedDays.map(d => formatDate(d));
    const data = sortedDays.map(d => days[d].result);

    AppState.chart.data.labels = labels;
    AppState.chart.data.datasets[0].data = data;
    AppState.chart.update();
}

// ============================================================
// ВАЛЮТЫ
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
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
        const data = await response.json();
        
        if (data.rates) {
            const usd = data.rates.USD || 1.10;
            const rub = data.rates.RUB || 90.00;
            
            document.getElementById('usdRate').value = usd.toFixed(4);
            document.getElementById('rubRate').value = rub.toFixed(2);
            
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
// УТИЛИТЫ
// ============================================================

// Хранилище активных уведомлений
const activeNotifications = [];

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
        'position:fixed;right:20px;padding:12px 20px;' +
        'background:' + (colors[type] || colors.info) + ';color:white;' +
        'border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);' +
        'z-index:2000;font-size:14px;max-width:400px;' +
        'animation:bounceIn 0.3s ease;cursor:pointer;' +
        'transition:opacity 0.5s ease, transform 0.3s ease;';
    notification.textContent = message;

    document.body.appendChild(notification);
    
    // Добавляем в хранилище
    activeNotifications.push(notification);
    
    // Обновляем позиции всех уведомлений
    updateNotificationPositions();
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        
        setTimeout(function() {
            notification.remove();
            // Удаляем из хранилища
            const index = activeNotifications.indexOf(notification);
            if (index > -1) {
                activeNotifications.splice(index, 1);
            }
            // Обновляем позиции оставшихся
            updateNotificationPositions();
        }, 500);
    }, 3000);

    notification.addEventListener('click', function() {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        
        setTimeout(function() {
            notification.remove();
            const index = activeNotifications.indexOf(notification);
            if (index > -1) {
                activeNotifications.splice(index, 1);
            }
            updateNotificationPositions();
        }, 500);
    });
}

// Обновление позиций уведомлений (стек снизу вверх)
function updateNotificationPositions() {
    const bottomOffset = 20;
    const gap = 10;
    
    // Проходим по уведомлениям снизу вверх
    for (let i = activeNotifications.length - 1; i >= 0; i--) {
        const notification = activeNotifications[i];
        const height = notification.offsetHeight;
        const positionFromBottom = bottomOffset + (activeNotifications.length - 1 - i) * (height + gap);
        
        notification.style.bottom = positionFromBottom + 'px';
    }
}

// ============================================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

// DOM уже загружен, так как скрипт находится в конце body
initApp();