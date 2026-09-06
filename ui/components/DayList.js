// ui/components/DayList.js
class DayList {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.expandedDay = null;
        this.currencySymbol = '€';
    }
    
    render(days, currencySymbol = '€') {
        this.currencySymbol = currencySymbol;
        this.container.innerHTML = '';
        
        if (days.length === 0) {
            this.container.innerHTML = '<div class="empty-state">Нет данных для отображения</div>';
            return;
        }
        
        for (const day of days) {
            const dayItem = this.createDayItem(day);
            this.container.appendChild(dayItem);
        }
    }
    
    createDayItem(day) {
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';
        
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
            <span class="day-date">${this.formatDate(day.day)}</span>
            <div class="day-stats">
                <span class="hands-count">${day.totalHands} рук</span>
                <span class="time">${formatTime(day.totalTime)}</span>
                <span class="result ${day.netResult >= 0 ? 'positive' : 'negative'}">
                    ${this.currencySymbol}${day.netResult.toFixed(2)}
                </span>
            </div>
        `;
        
        header.addEventListener('click', () => {
            this.toggleDay(day.day);
        });
        
        dayItem.appendChild(header);
        
        const sessionsContainer = document.createElement('div');
        sessionsContainer.className = 'day-sessions';
        sessionsContainer.id = `sessions-${day.day}`;
        
        if (this.expandedDay === day.day) {
            sessionsContainer.classList.remove('hidden');
            sessionsContainer.style.animation = 'slideDown 0.3s ease forwards';
            
            for (const session of day.sessions) {
                const sessionEl = this.createSessionItem(session);
                sessionsContainer.appendChild(sessionEl);
            }
        } else {
            sessionsContainer.classList.add('hidden');
        }
        
        dayItem.appendChild(sessionsContainer);
        return dayItem;
    }
    
    createSessionItem(session) {
        const sessionEl = document.createElement('div');
        sessionEl.className = 'session-item';
        sessionEl.innerHTML = `
            <span class="session-time">${this.formatTimeSession(session.startTime, session.endTime)}</span>
            <span class="session-hands">${session.handsCount} рук</span>
            <span class="session-result ${session.netResult >= 0 ? 'positive' : 'negative'}">
                ${this.currencySymbol}${session.netResult.toFixed(2)}
            </span>
        `;
        return sessionEl;
    }
    
    toggleDay(dayKey) {
        if (this.expandedDay === dayKey) {
            this.expandedDay = null;
        } else {
            this.expandedDay = dayKey;
        }
        
        if (this.callbacks.onDayToggle) {
            this.callbacks.onDayToggle(this.expandedDay);
        }
    }
    
    setExpandedDay(dayKey) {
        this.expandedDay = dayKey;
    }
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return date.toLocaleDateString('ru-RU', options);
    }
    
    formatTimeSession(start, end) {
        const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return `${startStr} - ${endStr}`;
    }
}