// ============================================================
// DATA MANAGER (с IndexedDB)
// ============================================================

function DataManager() {
    this.hands = [];
    this.stats = null;
    this.settings = this.loadSettings();
    this.heroNick = '';
    this.aliases = [];
    this.calculator = new StatsCalculator();
    this.isLoaded = false;
}

// Загрузка из IndexedDB
DataManager.prototype.loadHands = async function() {
    try {
        const hands = await loadHandsFromDB();
        this.hands = hands;
        this.isLoaded = true;
        
        if (this.heroNick) {
            this.recalculateStats();
        }
        return true;
    } catch (e) {
        console.error('Error loading hands from IndexedDB:', e);
        return false;
    }
};

// Сохранение в IndexedDB
DataManager.prototype.saveHands = async function() {
    try {
        await saveHandsToDB(this.hands);
        return true;
    } catch (e) {
        console.error('Error saving hands to IndexedDB:', e);
        return false;
    }
};

// Добавление рук с сохранением в IndexedDB
DataManager.prototype.addHands = async function(newHands) {
    var existingCodes = new Set(this.hands.map(function(h) { return h.gamecode; }));
    var uniqueNewHands = newHands.filter(function(h) {
        return !existingCodes.has(h.gamecode);
    });

    if (uniqueNewHands.length === 0) {
        return { added: 0, duplicates: newHands.length };
    }

    this.hands = this.hands.concat(uniqueNewHands);
    await this.saveHands();

    if (this.heroNick) {
        this.recalculateStats();
    }

    return {
        added: uniqueNewHands.length,
        duplicates: newHands.length - uniqueNewHands.length
    };
};

// Очистка данных
DataManager.prototype.clearAll = async function() {
    this.hands = [];
    this.stats = null;
    this.calculator.reset();
    await clearHandsFromDB();
};

// Получение количества рук в БД
DataManager.prototype.getHandsCount = function() {
    return countHandsInDB();
};