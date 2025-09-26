import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AdminEditingService, EditableContent } from '../services/admin-editing.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-editable-text',
    template: `
    <span *ngIf="!isEditing" 
          class="editable-text" 
          [class.editable]="canEdit"
          (click)="startEditing()">
      {{ displayValue }}
      <i *ngIf="canEdit && showEditIcon" class="fa fa-edit edit-icon ms-2"></i>
    </span>
    
    <input *ngIf="isEditing && inputType === 'text'"
           #editInput
           type="text"
           [(ngModel)]="currentValue"
           (blur)="save()"
           (keydown.enter)="save()"
           (keydown.escape)="cancel()"
           [class]="inputClass">
    
    <textarea *ngIf="isEditing && inputType === 'textarea'"
              #editTextarea
              [(ngModel)]="currentValue"
              (blur)="save()"
              (keydown.escape)="cancel()"
              [rows]="textareaRows"
              [class]="inputClass"></textarea>
  `,
    styles: [`
    .editable-text.editable {
      cursor: pointer;
      transition: background-color 0.2s ease;
      padding: 0.25rem;
      border-radius: 4px;
      position: relative;
    }
    
    .editable-text.editable:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .edit-icon {
      font-size: 0.7em;
      color: var(--c-gray-400);
    }
  `]
})
export class EditableTextComponent implements OnInit, OnDestroy {
    @Input() contentId!: string;
    @Input() initialValue: string = '';
    @Input() inputType: 'text' | 'textarea' = 'text';
    @Input() inputClass: string = 'form-control';
    @Input() textareaRows: number = 3;
    @Input() showEditIcon: boolean = true;
    @Output() valueChange = new EventEmitter<string>();

    @ViewChild('editInput') editInput!: ElementRef;
    @ViewChild('editTextarea') editTextarea!: ElementRef;

    private subscription: Subscription = new Subscription();
    private content: EditableContent | null = null;

    currentValue: string = '';
    canEdit: boolean = false;

    constructor(private editingService: AdminEditingService) { }

    ngOnInit(): void {
        // Register this content with the editing service
        this.editingService.registerContent(this.contentId, this.initialValue);
        this.content = this.editingService.getContent(this.contentId);

        if (this.content) {
            this.currentValue = this.content.value;
        }

        // Subscribe to global edit mode changes
        this.subscription.add(
            this.editingService.globalEditMode$.subscribe(editMode => {
                this.canEdit = editMode;
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    get displayValue(): string {
        return this.content?.value || this.initialValue;
    }

    get isEditing(): boolean {
        return this.content?.isEditing || false;
    }

    startEditing(): void {
        if (this.canEdit && this.content) {
            this.editingService.startEditing(this.contentId);
            this.currentValue = this.content.value;

            // Focus the input after the view updates
            setTimeout(() => {
                const input = this.editInput?.nativeElement || this.editTextarea?.nativeElement;
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 0);
        }
    }

    save(): void {
        if (this.content) {
            this.editingService.updateContent(this.contentId, this.currentValue);
            this.editingService.saveContent(this.contentId);
            this.valueChange.emit(this.currentValue);
        }
    }

    cancel(): void {
        if (this.content) {
            this.editingService.cancelEdit(this.contentId);
            this.currentValue = this.content.value;
        }
    }
}