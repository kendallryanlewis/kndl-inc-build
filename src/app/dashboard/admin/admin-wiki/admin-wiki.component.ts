import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

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
  selector: 'app-admin-wiki',
  templateUrl: './admin-wiki.component.html',
  styleUrls: ['./admin-wiki.component.scss']
})
export class AdminWikiComponent implements OnInit {
  @Input() subTab: string = 'Home';
  @Output() childTabs = new EventEmitter<string[]>();
  @Output() subTabChange = new EventEmitter<string>();
  sectionIds: string[] = ['Wiki', 'Pages', '+ New Page'];
  private previousSubTab: string = '';

  // Component state
  wikiPages: WikiPage[] = [];
  filteredPages: WikiPage[] = [];
  selectedPage: WikiPage | null = null;

  // Modal states
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showViewModal: boolean = false;

  // Form data
  editingPage: WikiPage | null = null;

  // Search and filtering
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedCategoryName: string = '';

  // UI modes
  viewMode: 'grid' | 'list' = 'grid';
  isAdminMode: boolean = true;
  isViewingPage: boolean = false;

  // Firebase
  private firestore = getFirestore();

  // Available categories
  categories = [
    'Documentation',
    'Tutorials',
    'FAQ',
    'Troubleshooting',
    'API',
    'Best Practices'
  ];

  constructor() { }

  async ngOnInit(): Promise<void> {
    // Ensure subTab defaults to 'Home' if not provided
    if (!this.subTab || this.subTab.trim() === '') {
      this.subTab = 'Home';
    }
    // Load data asynchronously and emit child tabs
    await Promise.all([
      this.loadWikiPages(),
      this.emitChildTabs()
    ]);
  }

  ngOnChanges(): void {
    if (this.subTab !== this.previousSubTab) {
      // DON'T reset changed fields when switching tabs - preserve changes across views
      // Only update the cached properties to reflect current state
      this.previousSubTab = this.subTab;
    }
  }

  // Page management methods
  createNewPage(): void {
    // Navigate to the create new page component
    this.subTab = 'Create New Page';
    this.subTabChange.emit(this.subTab);
  }

  managePages(): void {
    // Navigate to the manage pages component
    this.subTab = 'Pages';
    this.subTabChange.emit(this.subTab);
  }

  backToMainView(): void {
    // Navigate back to the main wiki view
    this.subTab = 'Home';
    this.subTabChange.emit(this.subTab);
  }

  onPageCreated(page: WikiPage): void {
    // Add the new page to the local array
    this.wikiPages.push(page);
    this.filterPages();
    // Navigate back to main view
    this.backToMainView();
  }
  private async emitChildTabs(): Promise<void> {
    // Emit available section IDs to parent components
    this.childTabs.emit(this.sectionIds);
  }

  editPage(page: WikiPage): void {
    this.editingPage = { ...page };
    this.showEditModal = true;
  }

  viewPage(page: WikiPage): void {
    this.selectedPage = page;
    this.isViewingPage = true;
    // Increment view count
    this.incrementViewCount(page);
  }

  backToList(): void {
    this.selectedPage = null;
    this.isViewingPage = false;
  }

  confirmDeletePage(page: WikiPage): void {
    this.selectedPage = page;
    this.showDeleteModal = true;
  }

  // Firebase CRUD operations
  async loadWikiPages(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, 'wikiPages'));
      this.wikiPages = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        this.wikiPages.push({
          id: docSnap.id,
          title: data['title'] || '',
          content: data['content'] || '',
          category: data['category'] || 'Documentation',
          tags: data['tags'] || [],
          author: data['author'] || '',
          createdDate: data['createdDate'] || new Date().toISOString(),
          lastModified: data['lastModified'] || new Date().toISOString(),
          isPublished: data['isPublished'] || false,
          views: data['views'] || 0,
          summary: data['summary'] || ''
        });
      });

      this.filterPages();
    } catch (error) {
      console.error('Error loading wiki pages:', error);
    }
  }

  async savePage(): Promise<void> {
    if (!this.editingPage) return;

    try {
      const now = new Date().toISOString();

      if (this.showCreateModal) {
        const newPage: Omit<WikiPage, 'id'> = {
          ...this.editingPage,
          createdDate: now,
          lastModified: now,
          views: 0
        };

        await addDoc(collection(this.firestore, 'wikiPages'), newPage);
      } else if (this.showEditModal) {
        const updatedPage: Omit<WikiPage, 'id'> = {
          ...this.editingPage,
          lastModified: now
        };

        await updateDoc(doc(this.firestore, 'wikiPages', this.editingPage.id), updatedPage);
      }

      this.closeModals();
      await this.loadWikiPages();
    } catch (error) {
      console.error('Error saving page:', error);
    }
  }

  async savePageFromList(updatedPage: WikiPage): Promise<void> {
    try {
      const now = new Date().toISOString();
      const pageUpdate: Omit<WikiPage, 'id'> = {
        ...updatedPage,
        lastModified: now
      };

      await updateDoc(doc(this.firestore, 'wikiPages', updatedPage.id), pageUpdate);
      await this.loadWikiPages();

      // Refresh the selected page with updated data if it's the same page
      if (this.selectedPage && this.selectedPage.id === updatedPage.id) {
        const refreshedPage = this.wikiPages.find(page => page.id === updatedPage.id);
        if (refreshedPage) {
          this.selectedPage = refreshedPage;
        }
      }
    } catch (error) {
      console.error('Error saving page from list:', error);
    }
  }

  async deletePage(): Promise<void> {
    if (!this.selectedPage) return;

    try {
      await deleteDoc(doc(this.firestore, 'wikiPages', this.selectedPage.id));
      this.closeModals();
      await this.loadWikiPages();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }

  async incrementViewCount(page: WikiPage): Promise<void> {
    try {
      const updatedPage = { ...page, views: page.views + 1 };
      await updateDoc(doc(this.firestore, 'wikiPages', page.id), { views: updatedPage.views });

      const index = this.wikiPages.findIndex(p => p.id === page.id);
      if (index !== -1) {
        this.wikiPages[index].views = updatedPage.views;
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  // Modal management
  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showViewModal = false;
    this.editingPage = null;
    this.selectedPage = null;
  }

  // Filtering and search
  filterPages(): void {
    let filtered = [...this.wikiPages];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(page =>
        page.title.toLowerCase().includes(term) ||
        page.content.toLowerCase().includes(term) ||
        page.summary?.toLowerCase().includes(term) ||
        page.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(page => page.category === this.selectedCategory);
    }
    this.filteredPages = filtered.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.selectedCategoryName = category;
    this.filterPages();
    this.subTab = 'Pages';
    this.subTabChange.emit(this.subTab);
  }

  clearCategoryFilter(): void {
    this.selectedCategory = '';
    this.selectedCategoryName = '';
    this.filterPages();
  }

  // Form helpers
  updateTags(tagsString: string): void {
    if (this.editingPage) {
      this.editingPage.tags = tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
  }

  updatePageTags(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateTags(target.value);
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCategoryCount(category: string): number {
    return this.wikiPages.filter(page => page.category === category).length;
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

  getTotalViews(): number {
    return this.wikiPages.reduce((total, page) => total + page.views, 0);
  }

  getPublishedPagesCount(): number {
    return this.wikiPages.filter(p => p.isPublished).length;
  }

  getDraftPagesCount(): number {
    return this.wikiPages.filter(p => !p.isPublished).length;
  }
}
