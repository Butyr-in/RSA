// ui/components/Widgets.js
class Widgets {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.elements = {};
        this.modes = {
            limit: 'average',
            hands: 'total',
            time: 'hours',
            result: 'eur'
        };
        
        this.render();
        this.bindEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <section class="widgets">
                <div class="widget" data-widget="limit">
                    <div class="widget-label">Средний лимит</div>
                    <div class="widget-value" id="avgLimit">NL0</div>
                    <div class="widget-sub" id="favoriteLimit">Любимый: NL0</div>
                </div>
                <div class="widget" data-widget="hands">
                    <div class="widget-label">Всего раздач</div>
                    <div class="widget-value" id="totalHands">0</div>
                    <div class="widget-sub" id="handsPerHour">0/час</div>
                </div>
                <div class="widget" data-widget="time">
                    <div class="widget-label">Время</div>
                    <div class="widget-value" id="totalTime">0:00</div>
                    <div class="widget-sub" id="totalTimeMinutes">0 мин</div>
                </div>
                <div class="widget" data-widget="result">
                    <div class="widget-label">Результат</div>
                    <div class="widget-value" id="netResult">€0.00</div>
                    <div class="widget-sub" id="resultDetails">0 рук выиграно</div>
                </div>
            </section>
        `;
        
        this.elements = {
            avgLimit: document.getElementById('avgLimit'),
            favoriteLimit: document.getElementById('favoriteLimit'),
            totalHands: document.getElementById('totalHands'),
            handsPerHour: document.getElementById('handsPerHour'),
            totalTime: document.getElementById('totalTime'),
            totalTimeMinutes: document.getElementById('totalTimeMinutes'),
            netResult: document.getElementById('netResult'),
            resultDetails: document.getElementById('resultDetails'),
            widgets: this.container.querySelectorAll('.widget')
        };
    }
    
    bindEvents() {
        this.elements.widgets.forEach(widget => {
            widget.addEventListener('click', () => {
                const type = widget.dataset.widget;
                this.toggleMode(type);
            });
        });
    }
    
    toggleMode(type) {
        const modes = {
            limit: ['average', 'favorite'],
            hands: ['total', 'perHour', 'perDay'],
            time: ['hours', 'minutes'],
            result: ['eur', 'usd', 'rub']
        };
        
        const current = this.modes[type];
        const modeList = modes[type];
        const currentIndex = modeList.indexOf(current);
        const nextIndex = (currentIndex + 1) % modeList.length;
        this.modes[type] = modeList[nextIndex];
        
        if (this.callbacks.onModeChange) {
            this.callbacks.onModeChange(type, this.modes[type]);
        }
        
        this.updateUI();
    }
    
    updateUI(stats, currencySymbol = '€') {
        if (!stats) return;
        
        const widgets = this.modes;
        
        // Лимит
        if (widgets.limit === 'average') {
            this.elements.avgLimit.textContent = `NL${stats.averageLimit || 0}`;
        } else {
            this.elements.avgLimit.textContent = stats.favoriteLimit || 'NL0';
        }
        this.elements.favoriteLimit.textContent = `Любимый: ${stats.favoriteLimit || 'NL0'}`;
        
        // Раздачи
        const totalHands = stats.totalHands || 0;
        this.elements.totalHands.textContent = totalHands;
        
        if (widgets.hands === 'total') {
            this.elements.handsPerHour.textContent = `${totalHands} всего`;
        } else if (widgets.hands === 'perHour') {
            const hours = (stats.totalTime || 0) / 3600;
            const perHour = hours > 0 ? Math.round(totalHands / hours) : 0;
            this.elements.handsPerHour.textContent = `${perHour}/час`;
        } else {
            const days = Object.keys(stats.days || {}).length || 1;
            const perDay = Math.round(totalHands / days);
            this.elements.handsPerHour.textContent = `${perDay}/день`;
        }
        
        // Время
        if (widgets.time === 'hours') {
            this.elements.totalTime.textContent = formatTime(stats.totalTime || 0);
        } else {
            this.elements.totalTime.textContent = formatMinutes(stats.totalTime || 0);
        }
        this.elements.totalTimeMinutes.textContent = formatMinutes(stats.totalTime || 0);
        
        // Результат
        const result = stats.netResult || 0;
        this.elements.netResult.textContent = `${currencySymbol}${result.toFixed(2)}`;
        this.elements.netResult.className = 'widget-value ' + (result >= 0 ? 'positive' : 'negative');
        
        const wonHands = stats.totalWon || 0;
        this.elements.resultDetails.textContent = `${wonHands} рук выиграно`;
    }
    
    getModes() {
        return this.modes;
    }
    
    setModes(modes) {
        this.modes = { ...this.modes, ...modes };
        this.updateUI();
    }
}