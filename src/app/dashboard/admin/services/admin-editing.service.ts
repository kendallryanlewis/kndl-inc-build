import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface EditableContent {
    id: string;
    value: string;
    originalValue: string;
    isEditing: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AdminEditingService {
    private globalEditMode = new BehaviorSubject<boolean>(false);
    public globalEditMode$ = this.globalEditMode.asObservable();

    private editableContents: Map<string, EditableContent> = new Map();

    constructor() {
        this.loadAllContent();
    }

    // Global edit mode management
    toggleGlobalEditMode(): void {
        const newMode = !this.globalEditMode.value;
        this.globalEditMode.next(newMode);

        if (!newMode) {
            // Save all changes when exiting edit mode
            this.saveAllContent();
        }
    }

    isGlobalEditMode(): boolean {
        return this.globalEditMode.value;
    }

    // Content management
    registerContent(id: string, initialValue: string): void {
        if (!this.editableContents.has(id)) {
            this.editableContents.set(id, {
                id,
                value: initialValue,
                originalValue: initialValue,
                isEditing: false
            });
        }
    }

    getContent(id: string): EditableContent | null {
        return this.editableContents.get(id) || null;
    }

    updateContent(id: string, value: string): void {
        const content = this.editableContents.get(id);
        if (content) {
            content.value = value;
        }
    }

    startEditing(id: string): void {
        const content = this.editableContents.get(id);
        if (content && this.globalEditMode.value) {
            content.originalValue = content.value;
            content.isEditing = true;
        }
    }

    saveContent(id: string): void {
        const content = this.editableContents.get(id);
        if (content) {
            content.isEditing = false;
            this.saveAllContent();
        }
    }

    cancelEdit(id: string): void {
        const content = this.editableContents.get(id);
        if (content) {
            content.value = content.originalValue;
            content.isEditing = false;
        }
    }

    // Persistence
    private saveAllContent(): void {
        const contentMap: { [key: string]: string } = {};
        this.editableContents.forEach((content, id) => {
            contentMap[id] = content.value;
        });

        localStorage.setItem('admin-editable-content', JSON.stringify(contentMap));
        console.log('All content saved to localStorage');
    }

    private loadAllContent(): void {
        const savedContent = localStorage.getItem('admin-editable-content');
        if (savedContent) {
            const contentMap = JSON.parse(savedContent);
            Object.keys(contentMap).forEach(id => {
                const content = this.editableContents.get(id);
                if (content) {
                    content.value = contentMap[id];
                }
            });
        }
    }

    // Reset all content to defaults
    resetAllContent(): void {
        this.editableContents.clear();
        localStorage.removeItem('admin-editable-content');
        console.log('All content reset to defaults');
    }

    // Export/Import functionality
    exportContent(): string {
        const contentMap: { [key: string]: string } = {};
        this.editableContents.forEach((content, id) => {
            contentMap[id] = content.value;
        });
        return JSON.stringify(contentMap, null, 2);
    }

    importContent(jsonContent: string): void {
        try {
            const contentMap = JSON.parse(jsonContent);
            Object.keys(contentMap).forEach(id => {
                const content = this.editableContents.get(id);
                if (content) {
                    content.value = contentMap[id];
                }
            });
            this.saveAllContent();
            console.log('Content imported successfully');
        } catch (error) {
            console.error('Error importing content:', error);
        }
    }
}