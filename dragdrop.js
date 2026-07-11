/* ========================================
   ALAN VAULT - DRAG & DROP HANDLER
   Drag & Drop File Management
   ======================================== */

class DragDropHandler {
    constructor() {
        this.dragCounter = 0;
        this.dropZones = [];
        this.init();
    }
    
    init() {
        this.setupGlobalDragEvents();
        this.scanDropZones();
    }
    
    setupGlobalDragEvents() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Track drag enter/leave globally
        document.body.addEventListener('dragenter', (e) => {
            this.dragCounter++;
            this.showGlobalDropOverlay();
        });
        
        document.body.addEventListener('dragleave', (e) => {
            this.dragCounter--;
            if (this.dragCounter === 0) {
                this.hideGlobalDropOverlay();
            }
        });
        
        document.body.addEventListener('drop', (e) => {
            this.dragCounter = 0;
            this.hideGlobalDropOverlay();
            this.handleGlobalDrop(e);
        });
    }
    
    showGlobalDropOverlay() {
        let overlay = document.getElementById('global-drop-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-drop-overlay';
            overlay.innerHTML = `
                <div class="drop-overlay-content">
                    <div class="drop-icon">📁</div>
                    <h3>Drop files to upload</h3>
                    <p>Drop anywhere to upload files to your vault</p>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
    }
    
    hideGlobalDropOverlay() {
        const overlay = document.getElementById('global-drop-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    handleGlobalDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && window.uploadHandler) {
            window.uploadHandler.handleFileSelect(files);
        }
    }
    
    scanDropZones() {
        const zones = document.querySelectorAll('[data-dropzone]');
        zones.forEach(zone => {
            this.registerDropZone(zone);
        });
    }
    
    registerDropZone(element, options = {}) {
        const zone = {
            element: element,
            onDrop: options.onDrop || null,
            onDragEnter: options.onDragEnter || null,
            onDragLeave: options.onDragLeave || null,
            acceptedTypes: options.acceptedTypes || []
        };
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('drag-over');
        });
        
        element.addEventListener('dragleave', (e) => {
            element.classList.remove('drag-over');
            if (zone.onDragLeave) zone.onDragLeave(e);
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            
            // Filter by accepted types
            let validFiles = files;
            if (zone.acceptedTypes.length > 0) {
                validFiles = files.filter(file => 
                    zone.acceptedTypes.some(type => 
                        file.type.includes(type) || file.name.endsWith(type)
                    )
                );
            }
            
            if (zone.onDrop) {
                zone.onDrop(validFiles, e);
            } else if (window.uploadHandler) {
                window.uploadHandler.handleFileSelect(validFiles);
            }
            
            this.dragCounter = 0;
            this.hideGlobalDropOverlay();
        });
        
        this.dropZones.push(zone);
        return zone;
    }
    
    registerFolderDrop(element, onFolderDrop) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            element.classList.add('drag-over');
        });
        
        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });
        
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            const items = e.dataTransfer.items;
            const files = [];
            
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) {
                    const folderFiles = await this.traverseFileTree(entry);
                    files.push(...folderFiles);
                }
            }
            
            if (onFolderDrop) onFolderDrop(files);
        });
    }
    
    async traverseFileTree(entry, path = '') {
        const files = [];
        
        if (entry.isFile) {
            const file = await this.getFileEntry(entry);
            file.relativePath = path + entry.name;
            files.push(file);
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await this.readAllEntries(reader);
            
            for (const childEntry of entries) {
                const childFiles = await this.traverseFileTree(childEntry, path + entry.name + '/');
                files.push(...childFiles);
            }
        }
        
        return files;
    }
    
    getFileEntry(entry) {
        return new Promise((resolve) => {
            entry.file(resolve);
        });
    }
    
    readAllEntries(reader) {
        return new Promise((resolve, reject) => {
            const entries = [];
            
            const readEntries = () => {
                reader.readEntries(async (batch) => {
                    if (batch.length === 0) {
                        resolve(entries);
                    } else {
                        entries.push(...batch);
                        readEntries();
                    }
                }, reject);
            };
            
            readEntries();
        });
    }
    
    createSortableList(container, onReorder) {
        let dragSrc = null;
        
        container.querySelectorAll('.sortable-item').forEach(item => {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', (e) => {
                dragSrc = item;
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                dragSrc = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (dragSrc && dragSrc !== item) {
                    const parent = container;
                    const children = Array.from(parent.children);
                    const dragIndex = children.indexOf(dragSrc);
                    const dropIndex = children.indexOf(item);
                    
                    if (dragIndex < dropIndex) {
                        item.parentNode.insertBefore(dragSrc, item.nextSibling);
                    } else {
                        item.parentNode.insertBefore(dragSrc, item);
                    }
                    
                    if (onReorder) onReorder(children);
                }
            });
        });
    }
    
    enableFileDragToElement(element, targetElement) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', element.id || '');
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        targetElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            targetElement.classList.add('drag-target');
        });
        
        targetElement.addEventListener('dragleave', () => {
            targetElement.classList.remove('drag-target');
        });
        
        targetElement.addEventListener('drop', (e) => {
            e.preventDefault();
            targetElement.classList.remove('drag-target');
            
            const id = e.dataTransfer.getData('text/plain');
            const draggedElement = document.getElementById(id);
            
            if (draggedElement && draggedElement !== targetElement) {
                targetElement.appendChild(draggedElement);
            }
        });
    }
    
    destroy() {
        this.dropZones.forEach(zone => {
            zone.element.removeEventListener('dragover', null);
            zone.element.removeEventListener('dragleave', null);
            zone.element.removeEventListener('drop', null);
        });
        
        this.dropZones = [];
    }
}

// Initialize drag and drop handler
const dragDropHandler = new DragDropHandler();
window.dragDropHandler = dragDropHandler;