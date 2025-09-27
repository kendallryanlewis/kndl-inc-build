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

  // Track changes for confirmation dialogs
  hasUnsavedChanges: boolean = false;
  originalPageContent: string = '';

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

    // Track original content for change detection
    this.originalPageContent = page.content;
    this.hasUnsavedChanges = false;

    console.log('Edit mode active for:', this.editingPageId);

    // Initialize WYSIWYG editor after the edit mode is set and DOM is updated
    setTimeout(() => {
      this.initializeWysiwygEditor();
    }, 100);
  }



  saveEdit(): void {
    if (this.editingPage) {
      // Show confirmation dialog before saving
      const confirmSave = window.confirm(
        `Are you sure you want to save changes to "${this.editingPage.title}"?\n\n` +
        'This will update the wiki page with your current changes.'
      );

      if (!confirmSave) {
        return; // User cancelled the save
      }

      // Get the exact content from WYSIWYG editor before saving
      if (this.wysiwygEditor && this.wysiwygEditor.nativeElement) {
        const editorContent = this.wysiwygEditor.nativeElement.innerHTML;
        console.log('Editor content before save:', editorContent);

        // Store the exact HTML content as it appears in the editor
        this.editingPage.content = editorContent;

        console.log('Page content after save:', this.editingPage.content);

        // Verify content matches
        if (editorContent === this.editingPage.content) {
          console.log('✅ Content consistency verified - editor matches saved content');
        } else {
          console.warn('⚠️ Content mismatch detected between editor and saved content');
        }
      }

      // Update metadata
      this.editingPage.lastModified = new Date().toISOString();

      this.onSavePage.emit(this.editingPage);

      // Reset change tracking since we just saved
      this.hasUnsavedChanges = false;
      this.originalPageContent = this.editingPage.content;

      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    // Check if there are unsaved changes
    if (this.hasUnsavedChanges) {
      const confirmCancel = window.confirm(
        `⚠️ UNSAVED CHANGES ⚠️\n\n` +
        `You have unsaved changes to "${this.editingPage?.title}". ` +
        `If you cancel now, all your changes will be lost.\n\n` +
        `Are you sure you want to cancel editing without saving?`
      );

      if (!confirmCancel) {
        return; // User wants to keep editing
      }
    }

    // Clean up WYSIWYG editor event listeners
    this.removeWysiwygEventListeners();

    // Reset tracking properties
    this.editingPageId = null;
    this.editingPage = null;
    this.hasUnsavedChanges = false;
    this.originalPageContent = '';
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

      // Track changes for confirmation dialogs
      this.checkForUnsavedChanges();
    }
  }

  // Track changes in title field
  onTitleChange(): void {
    if (this.editingPage) {
      this.checkForUnsavedChanges();
    }
  }

  // Track changes in category field
  onCategoryChange(): void {
    if (this.editingPage) {
      this.checkForUnsavedChanges();
    }
  }

  // Track changes in summary field
  onSummaryChange(): void {
    if (this.editingPage) {
      this.checkForUnsavedChanges();
    }
  }

  // Helper method to check if any field has changed
  public checkForUnsavedChanges(): void {
    if (!this.editingPage) return;

    // Find the original page to compare against
    const originalPage = this.wikiPages.find(p => p.id === this.editingPage!.id);
    if (!originalPage) return;

    // Check if any field has changed
    const hasChanges = (
      this.editingPage.title !== originalPage.title ||
      this.editingPage.category !== originalPage.category ||
      this.editingPage.summary !== originalPage.summary ||
      JSON.stringify(this.editingPage.tags.sort()) !== JSON.stringify(originalPage.tags.sort()) ||
      this.editingPage.content !== this.originalPageContent
    );

    this.hasUnsavedChanges = hasChanges;

    console.log('Unsaved changes check:', {
      hasChanges,
      titleChanged: this.editingPage.title !== originalPage.title,
      categoryChanged: this.editingPage.category !== originalPage.category,
      summaryChanged: this.editingPage.summary !== originalPage.summary,
      tagsChanged: JSON.stringify(this.editingPage.tags.sort()) !== JSON.stringify(originalPage.tags.sort()),
      contentChanged: this.editingPage.content !== this.originalPageContent
    });
  }

  confirmDeletePage(page: WikiPage): void {
    // Show confirmation dialog with detailed warning
    const confirmDelete = window.confirm(
      `⚠️ DELETE CONFIRMATION ⚠️\n\n` +
      `Are you sure you want to permanently delete the wiki page:\n` +
      `"${page.title}"\n\n` +
      `This action cannot be undone. The page and all its content will be permanently removed.\n\n` +
      `Page Details:\n` +
      `• Category: ${page.category}\n` +
      `• Author: ${page.author}\n` +
      `• Created: ${new Date(page.createdDate).toLocaleDateString()}\n` +
      `• Views: ${page.views}\n\n` +
      `Click OK to permanently delete this page, or Cancel to keep it.`
    );

    if (confirmDelete) {
      // User confirmed deletion
      this.onDeletePage.emit(page);
    }
    // If user cancels, nothing happens - page remains
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

      // Get the exact content from the editor and store it
      const currentContent = event.target.innerHTML;
      this.editingPage.content = currentContent;

      // Track if content has changed from original
      this.hasUnsavedChanges = (currentContent !== this.originalPageContent);

      console.log('Content updated in real-time:', {
        length: currentContent.length,
        hasFormatting: currentContent.includes('<'),
        preview: currentContent.substring(0, 100),
        hasUnsavedChanges: this.hasUnsavedChanges
      });

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

    // Populate editor with existing content exactly as stored
    if (this.wysiwygEditor && this.wysiwygEditor.nativeElement && this.editingPage) {
      const contentToLoad = this.editingPage.content || '';
      console.log('Loading content into editor:', {
        length: contentToLoad.length,
        hasFormatting: contentToLoad.includes('<'),
        preview: contentToLoad.substring(0, 100)
      });

      // Set the content exactly as it was stored
      this.wysiwygEditor.nativeElement.innerHTML = contentToLoad;

      // Verify the content was loaded correctly
      const loadedContent = this.wysiwygEditor.nativeElement.innerHTML;
      if (loadedContent === contentToLoad) {
        console.log('✅ Content loaded successfully into editor');
      } else {
        console.warn('⚠️ Content loading issue - stored vs loaded:', {
          stored: contentToLoad,
          loaded: loadedContent
        });
      }

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
    // Focus the editor to ensure commands work properly
    if (this.wysiwygEditor?.nativeElement) {
      this.wysiwygEditor.nativeElement.focus();
    }

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

    // Update the content after command execution and verify consistency
    if (this.wysiwygEditor && this.editingPage) {
      const updatedContent = this.wysiwygEditor.nativeElement.innerHTML;
      this.editingPage.content = updatedContent;

      console.log(`Command '${command}' executed:`, {
        command,
        value,
        contentLength: updatedContent.length,
        hasFormatting: updatedContent.includes('<')
      });
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