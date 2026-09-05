// ui/components/Header.js
export class Header {
  constructor(container, dataManager, callbacks) {
    this.container = container;
    this.dataManager = dataManager;
    this.callbacks = callbacks;
    this.elements = {};
    
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <header class="header">
        <div class="header-left">
          <div class="logo">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="#2c3e50" stroke="#e74c3c" stroke-width="2"/>
              <text x="16" y="22" text-anchor="middle" font-size="16" font-weight="bold" fill="#e74c3c" font-family="Arial">♠</text>
            </svg>
            <span class="logo-text">PokerStats</span>
          </div>
          <div class="header-controls">
            <div class="player-selector">
              <label>Игрок:</label>
              <select id="playerSelect" class="select">
                <option value="">Выберите игрока</option>
              </select>
              <button id="aliasBtn" class="btn-icon" title="Алиасы (дополнительные ники)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/>
                </svg>
              </button>
            </div>
            <div class="limit-filter">
              <label>Лимиты:</label>
              <select id="limitFilter" class="select" multiple>
                <option value="all">Все лимиты</option>
              </select>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button id="importBtn" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a1 1 0 011 1v6.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L7 8.586V2a1 1 0 011-1z"/>
              <path d="M2 14a1 1 0 01-1-1v-1a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H2z"/>
            </svg>
            Импорт
          </button>
          <button id="resetBtn" class="btn-secondary">Сброс</button>
        </div>
      </header>
    `;
    
    this.elements = {
      playerSelect: document.getElementById('playerSelect'),
      aliasBtn: document.getElementById('aliasBtn'),
      limitFilter: document.getElementById('limitFilter'),
      importBtn: document.getElementById('importBtn'),
      resetBtn: document.getElementById('resetBtn')
    };
  }
  
  bindEvents() {
    this.elements.playerSelect.addEventListener('change', () => {
      if (this.callbacks.onPlayerChange) {
        this.callbacks.onPlayerChange(this.elements.playerSelect.value);
      }
    });
    
    this.elements.aliasBtn.addEventListener('click', () => {
      if (this.callbacks.onAliasClick) {
        this.callbacks.onAliasClick();
      }
    });
    
    this.elements.importBtn.addEventListener('click', () => {
      if (this.callbacks.onImportClick) {
        this.callbacks.onImportClick();
      }
    });
    
    this.elements.resetBtn.addEventListener('click', () => {
      if (this.callbacks.onResetClick) {
        this.callbacks.onResetClick();
      }
    });
  }
  
  updatePlayerList(nicks, selectedNick) {
    const select = this.elements.playerSelect;
    select.innerHTML = '<option value="">Выберите игрока</option>';
    
    for (const nick of nicks) {
      const option = document.createElement('option');
      option.value = nick;
      option.textContent = nick;
      select.appendChild(option);
    }
    
    if (selectedNick && nicks.includes(selectedNick)) {
      select.value = selectedNick;
    }
  }
  
  updateLimitFilter(limits, selectedLimit) {
    const select = this.elements.limitFilter;
    select.innerHTML = '<option value="all">Все лимиты</option>';
    
    for (const limit of limits) {
      const option = document.createElement('option');
      option.value = limit;
      option.textContent = limit;
      select.appendChild(option);
    }
    
    if (selectedLimit && limits.has(selectedLimit)) {
      select.value = selectedLimit;
    }
  }
  
  getSelectedPlayer() {
    return this.elements.playerSelect.value;
  }
  
  getSelectedLimit() {
    return this.elements.limitFilter.value;
  }
}