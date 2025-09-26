import { Component, Input, Output, EventEmitter, forwardRef, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-advanced-editor',
  template: `
    <div class="advanced-editor-wrapper">
      <!-- Comprehensive Toolbar -->
      <div class="editor-toolbar">
        <!-- Text Formatting -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="execCommand('bold')" [class.active]="isCommandActive('bold')" title="Bold (Ctrl+B)">
            <i class="fa fa-bold"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('italic')" [class.active]="isCommandActive('italic')" title="Italic (Ctrl+I)">
            <i class="fa fa-italic"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('underline')" [class.active]="isCommandActive('underline')" title="Underline (Ctrl+U)">
            <i class="fa fa-underline"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('strikeThrough')" [class.active]="isCommandActive('strikeThrough')" title="Strikethrough">
            <i class="fa fa-strikethrough"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('subscript')" [class.active]="isCommandActive('subscript')" title="Subscript">
            <i class="fa fa-subscript"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('superscript')" [class.active]="isCommandActive('superscript')" title="Superscript">
            <i class="fa fa-superscript"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Font Size & Style -->
        <div class="toolbar-group">
          <select class="toolbar-select" (change)="changeFontSize($event)" title="Font Size">
            <option value="">Size</option>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
            <option value="7">36pt</option>
          </select>
          <select class="toolbar-select" (change)="changeFontName($event)" title="Font Family">
            <option value="">Font</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
            <option value="Helvetica">Helvetica</option>
          </select>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Text Color -->
        <div class="toolbar-group">
          <div class="color-picker-container">
            <button type="button" class="toolbar-btn color-btn" (click)="toggleColorPicker('text')" title="Text Color">
              <i class="fa fa-font"></i>
              <div class="color-bar" [style.background-color]="currentTextColor"></div>
            </button>
            <div class="color-picker" *ngIf="showTextColorPicker">
              <div class="color-grid">
                <div *ngFor="let color of colorPalette" 
                     class="color-swatch" 
                     [style.background-color]="color"
                     (click)="setTextColor(color)"
                     [title]="color">
                </div>
              </div>
            </div>
          </div>
          <div class="color-picker-container">
            <button type="button" class="toolbar-btn color-btn" (click)="toggleColorPicker('background')" title="Background Color">
              <i class="fa fa-paint-brush"></i>
              <div class="color-bar" [style.background-color]="currentBackgroundColor"></div>
            </button>
            <div class="color-picker" *ngIf="showBackgroundColorPicker">
              <div class="color-grid">
                <div *ngFor="let color of colorPalette" 
                     class="color-swatch" 
                     [style.background-color]="color"
                     (click)="setBackgroundColor(color)"
                     [title]="color">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Headings -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="formatBlock('h1')" [class.active]="isFormatActive('h1')" title="Heading 1">
            <strong>H1</strong>
          </button>
          <button type="button" class="toolbar-btn" (click)="formatBlock('h2')" [class.active]="isFormatActive('h2')" title="Heading 2">
            <strong>H2</strong>
          </button>
          <button type="button" class="toolbar-btn" (click)="formatBlock('h3')" [class.active]="isFormatActive('h3')" title="Heading 3">
            <strong>H3</strong>
          </button>
          <button type="button" class="toolbar-btn" (click)="formatBlock('p')" [class.active]="isFormatActive('p')" title="Normal">
            <i class="fa fa-paragraph"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Lists -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="execCommand('insertUnorderedList')" [class.active]="isCommandActive('insertUnorderedList')" title="Bullet List">
            <i class="fa fa-list-ul"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('insertOrderedList')" [class.active]="isCommandActive('insertOrderedList')" title="Numbered List">
            <i class="fa fa-list-ol"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="indent()" title="Increase Indent">
            <i class="fa fa-indent"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="outdent()" title="Decrease Indent">
            <i class="fa fa-outdent"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Alignment -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="execCommand('justifyLeft')" [class.active]="isCommandActive('justifyLeft')" title="Align Left">
            <i class="fa fa-align-left"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('justifyCenter')" [class.active]="isCommandActive('justifyCenter')" title="Align Center">
            <i class="fa fa-align-center"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('justifyRight')" [class.active]="isCommandActive('justifyRight')" title="Align Right">
            <i class="fa fa-align-right"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('justifyFull')" [class.active]="isCommandActive('justifyFull')" title="Justify">
            <i class="fa fa-align-justify"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Insert Elements -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="insertLink()" title="Insert Link">
            <i class="fa fa-link"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="insertImage()" title="Insert Image">
            <i class="fa fa-image"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="insertTable()" title="Insert Table">
            <i class="fa fa-table"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="insertHorizontalRule()" title="Insert Horizontal Rule">
            <i class="fa fa-minus"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Special Formatting -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="formatBlock('blockquote')" [class.active]="isFormatActive('blockquote')" title="Quote">
            <i class="fa fa-quote-left"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="formatBlock('pre')" [class.active]="isFormatActive('pre')" title="Code Block">
            <i class="fa fa-code"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('insertHTML', false, '<code></code>')" title="Inline Code">
            <i class="fa fa-terminal"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Actions -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="execCommand('undo')" title="Undo (Ctrl+Z)">
            <i class="fa fa-undo"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="execCommand('redo')" title="Redo (Ctrl+Y)">
            <i class="fa fa-redo"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="clearFormatting()" title="Clear Formatting">
            <i class="fa fa-eraser"></i>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- View Options -->
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" (click)="toggleFullscreen()" [class.active]="isFullscreen" title="Fullscreen">
            <i class="fa" [class.fa-expand]="!isFullscreen" [class.fa-compress]="isFullscreen"></i>
          </button>
          <button type="button" class="toolbar-btn" (click)="toggleSourceView()" [class.active]="showSource" title="Source Code">
            <i class="fa fa-code"></i>
          </button>
        </div>
      </div>

      <!-- Editor Content Area -->
      <div class="editor-content-wrapper" [class.fullscreen]="isFullscreen">
        <div *ngIf="!showSource" class="editor-content" 
             #editorContent
             contenteditable="true"
             [innerHTML]="value"
             (input)="onInput($event)"
             (blur)="onBlur()"
             (focus)="onFocus()"
             (paste)="onPaste($event)"
             (keydown)="onKeyDown($event)"
             (keyup)="onKeyUp($event)"
             (mouseup)="onSelectionChange($event)"
             [attr.placeholder]="placeholder"
             [class.disabled]="disabled"
             spellcheck="true">
        </div>
        
        <textarea *ngIf="showSource" 
                  class="source-editor"
                  [value]="value"
                  (input)="onSourceInput($event)"
                  [placeholder]="placeholder"
                  [disabled]="disabled">
        </textarea>
      </div>

      <!-- Status Bar -->
      <div class="editor-status-bar">
        <span class="word-count">Words: {{getWordCount()}}</span>
        <span class="char-count">Characters: {{getCharCount()}}</span>
        <span class="format-info" *ngIf="currentFormat">Format: {{currentFormat}}</span>
      </div>
    </div>
  `,
  styleUrls: ['./advanced-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AdvancedEditorComponent),
      multi: true
    }
  ]
})
export class AdvancedEditorComponent implements OnInit, ControlValueAccessor, AfterViewInit, OnDestroy {
  @Input() placeholder: string = 'Start writing...';
  @Input() readonly: boolean = false;

  @Output() contentChanged = new EventEmitter<any>();
  @Output() selectionChanged = new EventEmitter<any>();

  @ViewChild('editorContent', { static: false }) editorContentRef!: ElementRef;

  value: string = '';
  disabled: boolean = false;
  isFullscreen: boolean = false;
  showSource: boolean = false;
  showTextColorPicker: boolean = false;
  showBackgroundColorPicker: boolean = false;
  currentTextColor: string = '#000000';
  currentBackgroundColor: string = '#ffffff';
  currentFormat: string = '';

  // Color palette for text and background colors
  colorPalette = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'
  ];

  private isUpdatingContent: boolean = false;
  private isTyping: boolean = false;
  private typingTimeout: any = null;
  private hasFocus: boolean = false;

  // ControlValueAccessor implementation
  private onChange = (value: string) => { };
  private onTouched = () => { };

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit() {
    if (this.value && this.editorContentRef) {
      this.setContentWithoutMovingCursor(this.value);
    }
  }

  ngOnDestroy() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }

  writeValue(value: string): void {
    const newValue = value || '';

    // NEVER EVER update DOM if user has ANY interaction with editor
    if (this.isTyping ||
      this.hasFocus ||
      this.isUpdatingContent) {
      console.log('Blocked writeValue - user is actively using editor');
      // Still update internal value but NEVER touch DOM
      this.value = newValue;
      return;
    }

    // Only update if the value actually changed and user is completely disconnected
    if (this.value !== newValue) {
      console.log('WriteValue updating:', this.value, '->', newValue);
      this.value = newValue;
      if (this.editorContentRef) {
        this.setContentWithoutMovingCursor(this.value);
      }
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editorContentRef) {
      this.editorContentRef.nativeElement.contentEditable = !isDisabled;
    }
  }

  // Advanced Features
  changeFontSize(event: any): void {
    const size = event.target.value;
    if (size) {
      this.execCommand('fontSize', false, size);
    }
  }

  changeFontName(event: any): void {
    const font = event.target.value;
    if (font) {
      this.execCommand('fontName', false, font);
    }
  }

  toggleColorPicker(type: 'text' | 'background'): void {
    if (type === 'text') {
      this.showTextColorPicker = !this.showTextColorPicker;
      this.showBackgroundColorPicker = false;
    } else {
      this.showBackgroundColorPicker = !this.showBackgroundColorPicker;
      this.showTextColorPicker = false;
    }
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  setTextColor(color: string): void {
    this.currentTextColor = color;
    this.execCommand('foreColor', false, color);
    this.showTextColorPicker = false;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  setBackgroundColor(color: string): void {
    this.currentBackgroundColor = color;
    this.execCommand('backColor', false, color);
    this.showBackgroundColorPicker = false;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  insertTable(): void {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');

    if (rows && cols) {
      let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table><p></p>';

      this.insertHTML(tableHTML);
    }
  }

  insertHorizontalRule(): void {
    this.execCommand('insertHorizontalRule');
  }

  insertHTML(html: string): void {
    this.execCommand('insertHTML', false, html);
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  toggleSourceView(): void {
    this.showSource = !this.showSource;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  onSourceInput(event: any): void {
    this.value = event.target.value;
    this.onChange(this.value);
    this.contentChanged.emit({ html: this.value, text: this.getTextContent() });
  }

  getWordCount(): number {
    const text = this.getTextContent();
    return text ? text.trim().split(/\s+/).length : 0;
  }

  getCharCount(): number {
    return this.getTextContent().length;
  }

  getTextContent(): string {
    if (this.editorContentRef) {
      return this.editorContentRef.nativeElement.innerText || '';
    }
    return '';
  }

  // Core editor functionality - NEVER update DOM during user interaction
  private setContentWithoutMovingCursor(content: string): void {
    const editor = this.editorContentRef.nativeElement;

    // ABSOLUTE PROTECTION: Never update DOM if user is interacting in ANY way
    if (this.isTyping ||
      this.hasFocus ||
      this.isUpdatingContent ||
      document.activeElement === editor) {
      console.log('Blocked DOM update - user is interacting');
      return;
    }

    // Don't update if content is the same
    if (editor.innerHTML === content) return;

    // Only proceed if user is completely disconnected from the editor
    console.log('Updating DOM content - user not interacting');
    editor.innerHTML = content;
  }

  private getTextOffsetFromSelection(): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    try {
      const range = selection.getRangeAt(0);
      const editor = this.editorContentRef.nativeElement;

      const preCaretRange = document.createRange();
      preCaretRange.selectNodeContents(editor);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      const contents = preCaretRange.cloneContents();
      const textContent = contents.textContent || '';

      return textContent.length;
    } catch (e) {
      console.warn('Error getting text offset:', e);
      return 0;
    }
  }

  private setCursorAtTextOffset(offset: number): void {
    const editor = this.editorContentRef.nativeElement;
    const selection = window.getSelection();

    if (!selection) return;

    try {
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT
      );

      let currentOffset = 0;
      let node: Node | null;

      while (node = walker.nextNode()) {
        const nodeLength = node.textContent?.length || 0;

        if (currentOffset + nodeLength >= offset) {
          const range = document.createRange();
          const targetOffset = Math.max(0, Math.min(offset - currentOffset, nodeLength));
          range.setStart(node, targetOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        currentOffset += nodeLength;
      }

      // If we couldn't find the exact position, place cursor at end
      this.setCursorAtEnd();
    } catch (e) {
      console.warn('Error setting cursor position:', e);
      this.setCursorAtEnd();
    }
  }

  private setCursorAtEnd(): void {
    const editor = this.editorContentRef.nativeElement;
    const selection = window.getSelection();
    if (selection && editor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  onInput(event: any): void {
    // Prevent recursive updates
    if (this.isUpdatingContent) return;

    // IMMEDIATELY save cursor position before ANY processing
    const savedPosition = this.saveCursorPosition();

    this.isUpdatingContent = true;
    this.isTyping = true;

    const content = event.target.innerHTML;

    // Update internal value immediately but don't trigger external changes yet
    if (this.value !== content) {
      this.value = content;

      // Don't call onChange immediately - batch these calls
      this.debounceExternalUpdate(content, event.target.innerText);
    }

    // Restore cursor position IMMEDIATELY
    requestAnimationFrame(() => {
      this.restoreCursorPosition(savedPosition);
      this.isUpdatingContent = false;

      // Keep typing flag for longer to prevent writeValue interference
      setTimeout(() => {
        this.isTyping = false;
      }, 500); // Extended timeout
    });
  }

  private saveCursorPosition(): any {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    try {
      const range = selection.getRangeAt(0);
      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        collapsed: range.collapsed
      };
    } catch (e) {
      return null;
    }
  }

  private restoreCursorPosition(savedPosition: any): void {
    if (!savedPosition) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();

      // Verify the saved nodes are still in the document
      if (document.contains(savedPosition.startContainer) &&
        document.contains(savedPosition.endContainer)) {

        range.setStart(savedPosition.startContainer, savedPosition.startOffset);
        range.setEnd(savedPosition.endContainer, savedPosition.endOffset);

        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      // If restoration fails, place cursor at end
      this.setCursorAtEnd();
    }
  }

  private debounceTimeout: any = null;

  private debounceExternalUpdate(htmlContent: string, textContent: string): void {
    // Clear any pending updates
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Wait for user to stop typing before notifying external systems
    this.debounceTimeout = setTimeout(() => {
      this.onChange(htmlContent);
      this.contentChanged.emit({ html: htmlContent, text: textContent });
    }, 300); // Wait 300ms after last change
  }

  onBlur(): void {
    this.hasFocus = false;
    this.onTouched();
    this.showTextColorPicker = false;
    this.showBackgroundColorPicker = false;

    // Clear typing state when losing focus
    this.isTyping = false;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // Immediately flush any pending debounced updates when losing focus
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
      // Send the current content immediately
      this.onChange(this.value);
      this.contentChanged.emit({
        html: this.value,
        text: this.editorContentRef.nativeElement.innerText
      });
    }

    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  onFocus(): void {
    this.hasFocus = true;
    setTimeout(() => this.updateCurrentFormat(), 0);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text/html') || event.clipboardData?.getData('text/plain') || '';

    if (paste) {
      this.insertHTML(paste);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Save cursor position immediately
    const savedPosition = this.saveCursorPosition();

    // Mark that user is actively typing and clear any previous timeout
    this.isTyping = true;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          this.execCommand('bold');
          break;
        case 'i':
          event.preventDefault();
          this.execCommand('italic');
          break;
        case 'u':
          event.preventDefault();
          this.execCommand('underline');
          break;
        case 'z':
          event.preventDefault();
          this.execCommand(event.shiftKey ? 'redo' : 'undo');
          break;
        case 'y':
          event.preventDefault();
          this.execCommand('redo');
          break;
      }
    }

    // Ensure cursor position is maintained after any key processing
    setTimeout(() => {
      this.restoreCursorPosition(savedPosition);
    }, 0);
  }

  onKeyUp(event: KeyboardEvent): void {
    // Save and restore cursor position
    const savedPosition = this.saveCursorPosition();

    // Set a timeout to clear typing state after user stops typing
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
    }, 500); // Extended timeout

    setTimeout(() => {
      this.restoreCursorPosition(savedPosition);
      this.updateCurrentFormat();
      this.cdr.detectChanges();
    }, 0);
  }

  onSelectionChange(event: Event): void {
    this.selectionChanged.emit(event);
    setTimeout(() => {
      this.updateCurrentFormat();
      this.cdr.detectChanges();
    }, 0);
  }

  private updateCurrentFormat(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const element = selection.getRangeAt(0).commonAncestorContainer;
      const parentElement = element.nodeType === Node.TEXT_NODE ? element.parentElement : element as Element;

      if (parentElement) {
        this.currentFormat = parentElement.tagName?.toLowerCase() || 'p';
      }
    }
  }

  execCommand(command: string, showUI: boolean = false, value?: string): boolean {
    this.editorContentRef.nativeElement.focus();
    const result = document.execCommand(command, showUI, value);
    setTimeout(() => {
      this.updateValue();
      this.cdr.detectChanges();
    }, 0);
    return result;
  }

  formatBlock(tag: string): void {
    this.editorContentRef.nativeElement.focus();
    document.execCommand('formatBlock', false, `<${tag}>`);
    setTimeout(() => {
      this.updateValue();
      this.cdr.detectChanges();
    }, 0);
  }

  indent(): void {
    this.execCommand('indent');
  }

  outdent(): void {
    this.execCommand('outdent');
  }

  insertLink(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();
    const url = prompt('Enter URL:', 'https://');

    if (url) {
      if (selectedText) {
        this.execCommand('createLink', false, url);
      } else {
        const linkText = prompt('Enter link text:', url);
        if (linkText) {
          this.insertHTML(`<a href="${url}">${linkText}</a>`);
        }
      }
    }
  }

  insertImage(): void {
    const url = prompt('Enter image URL:');
    if (url) {
      this.insertHTML(`<img src="${url}" alt="Image" style="max-width: 100%; height: auto;">`);
    }
  }

  clearFormatting(): void {
    this.execCommand('removeFormat');
  }

  isCommandActive(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch (e) {
      return false;
    }
  }

  isFormatActive(tag: string): boolean {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;

        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode as Node;
        }

        let element = container as HTMLElement;
        while (element && element !== this.editorContentRef.nativeElement) {
          if (element.tagName && element.tagName.toLowerCase() === tag.toLowerCase()) {
            return true;
          }
          element = element.parentElement as HTMLElement;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private updateValue(): void {
    if (this.isUpdatingContent) return;

    const content = this.editorContentRef.nativeElement.innerHTML;
    this.value = content;
    this.onChange(content);
    this.contentChanged.emit({
      html: content,
      text: this.editorContentRef.nativeElement.innerText
    });
  }
}