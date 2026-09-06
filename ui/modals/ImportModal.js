// ui/modals/ImportModal.js
class ImportModal {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.elements = {};
        this.isProcessing = false;
        
        this.render();
        this.bindEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div id="overlay" class="overlay hidden"></div>
            <div id="importModal" class="modal hidden">
                <div class="modal-content import-modal">
                    <div class="modal-header">
                        <h3>Импорт раздач</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="dropZone" class="drop-zone">
                            <div class="drop-zone-content">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                                    <path d="M24 4a2 2 0 012 2v13.172l4.586-4.586a2 2 0 012.828 2.828L27.657 24l5.757 5.757a2 2 0 01-2.828 2.828L26 26.828V40a2 2 0 01-4 0V26.828l-5.586 5.586a2 2 0 01-2.828-2.828L19.343 24 13.586 18.243a2 2 0 012.828-2.828L22 19.172V6a2 2 0 012-2z"/>
                                </svg>
                                <p class="drop-text">Перетащите файлы, папки или архивы сюда</p>
                                <p class="drop-hint">Поддерживаются .xml, .zip, .rar</p>
                                <div class="drop-actions">
                                    <button id="selectFilesBtn" class="btn-primary">Выбрать файлы</button>
                                    <button id="selectFolderBtn" class="btn-secondary">Выбрать папку</button>
                                </div>
                            </div>
                        </div>
                        
                        <div id="progressContainer" class="progress-container hidden">
                            <div class="progress-stage" id="progressStage">Подготовка...</div>
                            <div class="progress-bar-wrapper">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                                    <span class="progress-percentage" id="progressPercentage">0%</span>
                                </div>
                            </div>
                            <div class="progress-details" id="progressDetails">
                                <span>Файлы: <span id="processedFiles">0</span> / <span id="totalFiles">0</span></span>
                            </div>
                            <div class="progress-stats">
                                <span>📊 Найдено рук: <span id="totalHandsFound">0</span></span>
                                <span>➕ Добавлено: <span id="newHandsAdded">0</span></span>
                                <span>⏭ Пропущено дублей: <span id="duplicateHandsSkipped">0</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <input type="file" id="fileInput" accept=".xml,.zip,.rar" multiple style="display:none" />
            <input type="file" id="folderInput" webkitdirectory multiple style="display:none" />
        `;
        
        this.elements = {
            overlay: document.getElementById('overlay'),
            importModal: document.getElementById('importModal'),
            dropZone: document.getElementById('dropZone'),
            selectFilesBtn: document.getElementById('selectFilesBtn'),
            selectFolderBtn: document.getElementById('selectFolderBtn'),
            fileInput: document.getElementById('fileInput'),
            folderInput: document.getElementById('folderInput'),
            progressContainer: document.getElementById('progressContainer'),
            progressStage: document.getElementById('progressStage'),
            progressFill: document.getElementById('progressFill'),
            progressPercentage: document.getElementById('progressPercentage'),
            processedFiles: document.getElementById('processedFiles'),
            totalFiles: document.getElementById('totalFiles'),
            totalHandsFound: document.getElementById('totalHandsFound'),
            newHandsAdded: document.getElementById('newHandsAdded'),
            duplicateHandsSkipped: document.getElementById('duplicateHandsSkipped'),
            modalClose: this.container.querySelector('.modal-close')
        };
    }
    
    bindEvents() {
        this.elements.selectFilesBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.selectFolderBtn.addEventListener('click', () => {
            this.elements.folderInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            if (this.callbacks.onFilesSelected) {
                this.callbacks.onFilesSelected(e.target.files);
            }
            e.target.value = '';
        });
        
        this.elements.folderInput.addEventListener('change', (e) => {
            if (this.callbacks.onFilesSelected) {
                this.callbacks.onFilesSelected(e.target.files);
            }
            e.target.value = '';
        });
        
        this.elements.overlay.addEventListener('click', () => {
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
        
        this.setupDropZone();
    }
    
    setupDropZone() {
        const zone = this.elements.dropZone;
        
        ['dragenter', 'dragover'].forEach(event => {
            zone.addEventListener(event, (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(event => {
            zone.addEventListener(event, (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            const items = e.dataTransfer.items;
            const files = [];
            
            for (const item of items) {
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (entry) {
                    files.push({ entry, isFile: entry.isFile });
                } else {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
            
            if (this.callbacks.onDrop) {
                this.callbacks.onDrop(files);
            }
        });
    }
    
    open() {
        this.elements.overlay.classList.remove('hidden');
        this.elements.importModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.elements.overlay.classList.add('hidden');
        this.elements.importModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    showProgress() {
        this.elements.progressContainer.classList.remove('hidden');
        this.elements.progressFill.style.width = '0%';
        this.elements.progressPercentage.textContent = '0%';
        this.elements.processedFiles.textContent = '0';
        this.elements.totalFiles.textContent = '0';
        this.elements.totalHandsFound.textContent = '0';
        this.elements.newHandsAdded.textContent = '0';
        this.elements.duplicateHandsSkipped.textContent = '0';
    }
    
    updateProgress(stage, message, percent, total = 0, processed = 0) {
        const stageMap = {
            'extracting': '📦 Распаковка архивов...',
            'parsing': '📄 Обработка файлов...',
            'saving': '💾 Сохранение данных...'
        };
        
        this.elements.progressStage.textContent = message || stageMap[stage] || stage;
        this.elements.progressFill.style.width = Math.min(percent, 100) + '%';
        this.elements.progressPercentage.textContent = Math.round(Math.min(percent, 100)) + '%';
        
        if (total > 0) {
            this.elements.processedFiles.textContent = processed;
            this.elements.totalFiles.textContent = total;
        }
    }
    
    hideProgress() {
        this.elements.progressContainer.classList.add('hidden');
        this.elements.progressFill.style.width = '0%';
    }
    
    updateStats(totalHands, added, duplicates) {
        this.elements.totalHandsFound.textContent = totalHands || 0;
        this.elements.newHandsAdded.textContent = added || 0;
        this.elements.duplicateHandsSkipped.textContent = duplicates || 0;
    }
    
    setProcessing(processing) {
        this.isProcessing = processing;
    }
}