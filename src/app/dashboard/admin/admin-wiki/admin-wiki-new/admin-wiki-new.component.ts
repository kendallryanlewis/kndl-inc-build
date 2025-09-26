import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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
  selector: 'app-admin-wiki-new',
  templateUrl: './admin-wiki-new.component.html',
  styleUrls: ['./admin-wiki-new.component.scss']
})
export class AdminWikiNewComponent implements OnInit {
  @Output() onBackToList = new EventEmitter<void>();
  @Output() onPageCreated = new EventEmitter<WikiPage>();

  // Form data
  editingPage: WikiPage = {
    id: '',
    title: '',
    content: '',
    category: 'Documentation',
    tags: [],
    author: '',
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    isPublished: false,
    views: 0,
    summary: ''
  };

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

  ngOnInit(): void {
    // Initialize with fresh page data
    this.resetForm();
  }

  resetForm(): void {
    this.editingPage = {
      id: '',
      title: '',
      content: '',
      category: 'Documentation',
      tags: [],
      author: '',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isPublished: false,
      views: 0,
      summary: ''
    };
  }

  async savePage(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const newPage: Omit<WikiPage, 'id'> = {
        ...this.editingPage,
        createdDate: now,
        lastModified: now,
        views: 0
      };

      const docRef = await addDoc(collection(this.firestore, 'wikiPages'), newPage);

      // Emit the created page with the new ID
      const createdPage: WikiPage = {
        ...newPage,
        id: docRef.id
      };

      this.onPageCreated.emit(createdPage);

      // Show success message or navigate back
      console.log('Wiki page created successfully!');
      this.backToList();

    } catch (error) {
      console.error('Error creating page:', error);
      alert('Failed to create wiki page. Please try again.');
    }
  }

  backToList(): void {
    this.onBackToList.emit();
  }

  // Form helpers
  updateTags(tagsString: string): void {
    this.editingPage.tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
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
}
