// ui/components/Footer.js
class Footer {
    constructor(container, dataManager, callbacks) {
        this.container = container;
        this.dataManager = dataManager;
        this.callbacks = callbacks;
        this.elements = {};
        
        this.render();
        this.bindEvents();
        this.loadSettings();
    }
    
    render() {
        this.container.innerHTML = `
            <footer class="footer">
                <div class="footer-left">
                    <div class="setting-group">
                        <label>Начало дня:</label>
                        <input type="time" id="dayStart" value="06:00" step="60" />
                    </div>
                    <div class="setting-group">
                        <label>Разрыв сессий:</label>
                        <input type="number" id="sessionBreak" value="5" min="1" max="60" />
                        <span>мин</span>
                    </div>
                </div>
                <div class="footer-center">
                    <div class="currency-rates">
                        <div class="currency-item">
                            <span class="currency-symbol">$</span>
                            <input type="number" id="usdRate" step="0.01" value="1.10" class="currency-input" />
                        </div>
                        <div class="currency-item">
                            <span class="currency-symbol">€</span>
                            <input type="number" id="eurRate" step="0.01" value="1.00" class="currency-input" />
                        </div>
                        <div class="currency-item">
                            <span class="currency-symbol">₽</span>
                            <input type="number" id="rubRate" step="0.01" value="90.00" class="currency-input" />
                        </div>
                        <button id="updateRatesBtn" class="btn-sm">Обновить курсы</button>
                    </div>
                </div>
                <div class="footer-right">
                    <span class="copyright">© Butyrin <span id="currentYear">2026</span></span>
                    <a href="https://t.me/GGPKR" target="_blank" class="telegram-link">📱 Telegram</a>
                </div>
            </footer>
        `;
        
        this.elements = {
            dayStart: document.getElementById('dayStart'),
            sessionBreak: document.getElementById('sessionBreak'),
            usdRate: document.getElementById('usdRate'),
            eurRate: document.getElementById('eurRate'),
            rubRate: document.getElementById('rubRate'),
            updateRatesBtn: document.getElementById('updateRatesBtn'),
            currentYear: document.getElementById('currentYear')
        };
        
        this.elements.currentYear.textContent = new Date().getFullYear();
    }
    
    bindEvents() {
        this.elements.dayStart.addEventListener('change', () => {
            const [hours, minutes] = this.elements.dayStart.value.split(':').map(Number);
            if (this.callbacks.onDayStartChange) {
                this.callbacks.onDayStartChange(hours + minutes / 60);
            }
        });
        
        this.elements.sessionBreak.addEventListener('change', () => {
            const minutes = parseInt(this.elements.sessionBreak.value) || 5;
            if (this.callbacks.onSessionBreakChange) {
                this.callbacks.onSessionBreakChange(minutes);
            }
        });
        
        this.elements.updateRatesBtn.addEventListener('click', () => {
            if (this.callbacks.onUpdateRates) {
                this.callbacks.onUpdateRates();
            }
        });
        
        this.elements.usdRate.addEventListener('change', () => {
            this.saveRates();
        });
        this.elements.eurRate.addEventListener('change', () => {
            this.saveRates();
        });
        this.elements.rubRate.addEventListener('change', () => {
            this.saveRates();
        });
    }
    
    loadSettings() {
        const settings = this.dataManager.settings;
        
        const dayStartHours = Math.floor(settings.dayStartHour);
        const dayStartMinutes = (settings.dayStartHour % 1) * 60;
        this.elements.dayStart.value = `${String(dayStartHours).padStart(2, '0')}:${String(dayStartMinutes).padStart(2, '0')}`;
        
        this.elements.sessionBreak.value = settings.sessionBreakMinutes;
        
        if (settings.currencyRates) {
            this.elements.usdRate.value = settings.currencyRates.USD || 1.10;
            this.elements.eurRate.value = settings.currencyRates.EUR || 1.00;
            this.elements.rubRate.value = settings.currencyRates.RUB || 90.00;
        }
    }
    
    saveRates() {
        const rates = {
            USD: parseFloat(this.elements.usdRate.value) || 1.10,
            EUR: parseFloat(this.elements.eurRate.value) || 1.00,
            RUB: parseFloat(this.elements.rubRate.value) || 90.00
        };
        
        if (this.callbacks.onSaveRates) {
            this.callbacks.onSaveRates(rates);
        }
    }
    
    getRates() {
        return {
            USD: parseFloat(this.elements.usdRate.value) || 1.10,
            EUR: parseFloat(this.elements.eurRate.value) || 1.00,
            RUB: parseFloat(this.elements.rubRate.value) || 90.00
        };
    }
    
    setRates(rates) {
        if (rates.USD) this.elements.usdRate.value = rates.USD;
        if (rates.EUR) this.elements.eurRate.value = rates.EUR;
        if (rates.RUB) this.elements.rubRate.value = rates.RUB;
    }
    
    setUpdateButtonLoading(loading) {
        this.elements.updateRatesBtn.textContent = loading ? 'Загрузка...' : 'Обновить курсы';
        this.elements.updateRatesBtn.disabled = loading;
    }
}