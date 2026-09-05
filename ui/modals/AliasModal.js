// ui/modals/AliasModal.js
export class AliasModal {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.elements = {};
    
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div id="aliasModal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Алиасы (дополнительные ники)</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>Введите дополнительные ники через запятую:</p>
            <textarea id="aliasInput" rows="3" placeholder="nick1, nick2, nick3"></textarea>
            <div class="modal-actions">
              <button id="saveAliases" class="btn-primary">Сохранить</button>
              <button id="cancelAliases" class="btn-secondary">Отмена</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.elements = {
      aliasModal: document.getElementById('aliasModal'),
      aliasInput: document.getElementById('aliasInput'),
      saveAliases: document.getElementById('saveAliases'),
      cancelAliases: document.getElementById('cancelAliases'),
      modalClose: this.container.querySelector('.modal-close')
    };
  }
  
  bindEvents() {
    this.elements.saveAliases.addEventListener('click', () => {
      if (this.callbacks.onSave) {
        this.callbacks.onSave(this.elements.aliasInput.value);
      }
    });
    
    this.elements.cancelAliases.addEventListener('click', () => {
      this.close();
    });
    
    this.elements.modalClose.addEventListener('click', () => {
      this.close();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }
  
  open(aliases = []) {
    this.elements.aliasInput.value = aliases.join(', ');
    this.elements.aliasModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  
  close() {
    this.elements.aliasModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}