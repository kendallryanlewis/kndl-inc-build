import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

declare var window: any; // Window object

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: 'Documentation' | 'Tutorials' | 'FAQ' | 'Troubleshooting' | 'API' | 'Best Practices';
  tags: string[];
  author: string;
  createdDate: string;
  lastModified: string;
  isPublished: boolean;
  views: number;
  summary: string;
}

@Component({
  selector: 'app-admin-wiki-list',
  templateUrl: './admin-wiki-list.component.html',
  styleUrls: ['./admin-wiki-list.component.scss']
})
export class AdminWikiListComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() wikiPages: WikiPage[] = [];
  @Input() filteredPages: WikiPage[] = [];
  @Input() selectedPage: WikiPage | null = null;
  @Input() searchTerm: string = '';
  @Input() selectedCategory: string = '';
  @Input() selectedCategoryName: string = '';
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() isAdminMode: boolean = true;
  @Input() isViewingPage: boolean = false;

  ngOnInit() {
    console.log('WikiListComponent initialized');
    console.log('Filtered pages count:', this.filteredPages.length);
    console.log('View mode:', this.viewMode);
  }

  @Output() onViewPage = new EventEmitter<WikiPage>();
  @Output() onEditPage = new EventEmitter<WikiPage>();
  @Output() onDeletePage = new EventEmitter<WikiPage>();
  @Output() onCreateNewPage = new EventEmitter<void>();
  @Output() onBackToList = new EventEmitter<void>();
  @Output() onViewModeChange = new EventEmitter<'grid' | 'list'>();
  @Output() onSearchChange = new EventEmitter<string>();
  @Output() onFilterByCategory = new EventEmitter<string>();
  @Output() onClearCategoryFilter = new EventEmitter<void>();
  @Output() onSavePage = new EventEmitter<WikiPage>();

  // Inline editing state
  editingPageId: string | null = null;
  editingPage: WikiPage | null = null;
  categories: string[] = ['Documentation', 'Tutorials', 'FAQ', 'Troubleshooting', 'API', 'Best Practices'];

  @ViewChild('wysiwygEditor', { static: false }) wysiwygEditor!: ElementRef;

  ngAfterViewInit() {
    // Initialize WYSIWYG editor after view init if in edit mode
    if (this.editingPageId && this.wysiwygEditor) {
      setTimeout(() => {
        this.initializeWysiwygEditor();
      }, 100);
    }
  }

  ngOnDestroy() {
    // Clean up event listeners if needed
    this.removeWysiwygEventListeners();
  }


  showAddServicePlanModal(): void {
    console.log('Show All the service plans');
    this.cancelEdit();
    this.filteredPages = this.wikiPages;
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Documentation': 'primary',
      'Tutorials': 'success',
      'FAQ': 'info',
      'Troubleshooting': 'warning',
      'API': 'danger',
      'Best Practices': 'dark'
    };
    return colors[category] || 'secondary';
  }

  getCategoryClass(category: string): string {
    const classes: { [key: string]: string } = {
      'Documentation': 'documentation',
      'Tutorials': 'tutorials',
      'FAQ': 'community',
      'Troubleshooting': 'troubleshooting',
      'API': 'developer',
      'Best Practices': 'best-practices'
    };
    return classes[category] || 'documentation';
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Documentation': 'fa-book',
      'Tutorials': 'fa-graduation-cap',
      'FAQ': 'fa-question-circle',
      'Troubleshooting': 'fa-tools',
      'API': 'fa-code',
      'Best Practices': 'fa-star'
    };
    return icons[category] || 'fa-file-text';
  }

  getCategoryCount(category: string): number {
    return this.wikiPages.filter(page => page.category === category).length;
  }

  // Event handlers
  viewPage(page: WikiPage): void {
    this.onViewPage.emit(page);
  }

  editPage(page: WikiPage): void {
    console.log('Edit button clicked for page:', page.title);
    console.log('Setting editingPageId to:', page.id);
    this.editingPageId = page.id;
    this.editingPage = { ...page };
    console.log('Edit mode active for:', this.editingPageId);

    // Initialize WYSIWYG editor after the edit mode is set and DOM is updated
    setTimeout(() => {
      this.initializeWysiwygEditor();
    }, 100);
  }



  saveEdit(): void {
    if (this.editingPage) {
      // Get the latest content from WYSIWYG editor before saving
      if (this.wysiwygEditor && this.wysiwygEditor.nativeElement) {
        this.editingPage.content = this.wysiwygEditor.nativeElement.innerHTML;
      }

      // Update metadata
      this.editingPage.lastModified = new Date().toISOString();

      this.onSavePage.emit(this.editingPage);
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    // Clean up WYSIWYG editor event listeners
    this.removeWysiwygEventListeners();

    this.editingPageId = null;
    this.editingPage = null;
  }

  isEditing(page: WikiPage): boolean {
    const isEditing = this.editingPageId === page.id;
    return isEditing;
  }

  updateEditTags(event: Event): void {
    if (this.editingPage) {
      const target = event.target as HTMLInputElement;
      this.editingPage.tags = target.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
  }

  confirmDeletePage(page: WikiPage): void {
    this.onDeletePage.emit(page);
  }

  createNewPage(): void {
    this.onCreateNewPage.emit();
  }

  backToList(): void {
    this.onBackToList.emit();
    this.cancelEdit();
  }

  changeViewMode(mode: 'grid' | 'list'): void {
    this.onViewModeChange.emit(mode);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onSearchChange.emit(target.value);
  }

  filterByCategory(category: string): void {
    this.onFilterByCategory.emit(category);
  }

  clearCategoryFilter(): void {
    this.onClearCategoryFilter.emit();
  }

  // WYSIWYG Editor Methods
  onEditorContentChange(event: any): void {
    if (this.editingPage) {
      // Save cursor position
      const selection = this.saveSelection();

      // Update content
      this.editingPage.content = event.target.innerHTML;

      // Don't restore selection here to avoid infinite loop
      // The selection is preserved naturally since we're not re-rendering innerHTML
    }
  }

  onEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  // Save current cursor position
  private saveSelection(): { start: number; end: number } | null {
    if (!this.wysiwygEditor?.nativeElement) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.wysiwygEditor.nativeElement);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    const start = preCaretRange.toString().length;
    const end = start + range.toString().length;

    return { start, end };
  }

  // Restore cursor position
  private restoreSelection(savedSelection: { start: number; end: number }): void {
    if (!this.wysiwygEditor?.nativeElement || !savedSelection) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let currentPos = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;

    const walker = document.createTreeWalker(
      this.wysiwygEditor.nativeElement,
      NodeFilter.SHOW_TEXT
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentPos + nodeLength >= savedSelection.start) {
        startNode = node;
        startOffset = savedSelection.start - currentPos;
      }

      if (!endNode && currentPos + nodeLength >= savedSelection.end) {
        endNode = node;
        endOffset = savedSelection.end - currentPos;
        break;
      }

      currentPos += nodeLength;
    }

    if (startNode) {
      try {
        range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
        range.setEnd(endNode || startNode, Math.min(endOffset, (endNode || startNode).textContent?.length || 0));

        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // Fallback: place cursor at end
        range.selectNodeContents(this.wysiwygEditor.nativeElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }



  private initializeWysiwygEditor(): void {
    // Initialize color palettes
    this.initializeColorPalettes();

    // Add toolbar event listeners
    this.addToolbarEventListeners();

    // Populate editor with existing content
    if (this.wysiwygEditor && this.wysiwygEditor.nativeElement && this.editingPage) {
      this.wysiwygEditor.nativeElement.innerHTML = this.editingPage.content || '';
      // Focus the editor
      this.wysiwygEditor.nativeElement.focus();
    }
  }

  private initializeColorPalettes(): void {
    const colorPalette = ['000000', 'FF9966', '6699FF', '99FF66', 'CC0000', '00CC00', '0000CC', '333333', '0066FF', 'FFFFFF'];

    // Get palette containers
    const forePalette = document.querySelector('.fore-palette');
    const backPalette = document.querySelector('.back-palette');

    if (forePalette && backPalette) {
      // Clear existing palettes
      forePalette.innerHTML = '';
      backPalette.innerHTML = '';

      // Add color items
      for (let i = 0; i < colorPalette.length; i++) {
        const foreColor = document.createElement('a');
        foreColor.href = '#';
        foreColor.dataset['command'] = 'forecolor';
        foreColor.dataset['value'] = '#' + colorPalette[i];
        foreColor.style.backgroundColor = '#' + colorPalette[i];
        foreColor.className = 'palette-item';
        forePalette.appendChild(foreColor);

        const backColor = document.createElement('a');
        backColor.href = '#';
        backColor.dataset['command'] = 'backcolor';
        backColor.dataset['value'] = '#' + colorPalette[i];
        backColor.style.backgroundColor = '#' + colorPalette[i];
        backColor.className = 'palette-item';
        backPalette.appendChild(backColor);
      }
    }
  }

  private addToolbarEventListeners(): void {
    const toolbarLinks = document.querySelectorAll('.toolbar a');

    toolbarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const command = (e.target as HTMLElement).closest('a')?.dataset['command'];
        const value = (e.target as HTMLElement).closest('a')?.dataset['value'];

        if (command) {
          this.executeCommand(command, value);
        }
      });
    });
  }

  private executeCommand(command: string, value?: string): void {
    if (command === 'h1' || command === 'h2') {
      document.execCommand('formatBlock', false, command);
    } else if (command === 'forecolor' || command === 'backcolor') {
      document.execCommand(command, false, value);
    } else if (command === 'createlink') {
      const url = prompt('Enter the link URL:');
      if (url) {
        document.execCommand(command, false, url);
      }
    } else {
      document.execCommand(command, false, value);
    }

    // Update the content after command execution
    if (this.wysiwygEditor && this.editingPage) {
      this.editingPage.content = this.wysiwygEditor.nativeElement.innerHTML;
    }
  }

  private removeWysiwygEventListeners(): void {
    // Clean up event listeners to prevent memory leaks
    const toolbarLinks = document.querySelectorAll('.toolbar a');
    toolbarLinks.forEach(link => {
      link.removeEventListener('click', () => { });
    });
  }
}