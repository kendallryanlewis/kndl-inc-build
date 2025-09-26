import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CallToActionContent } from 'src/app/models/CallToActionContent';

@Component({
  selector: 'app-kndl-call-to-action',
  templateUrl: './kndl-call-to-action.component.html',
  styleUrls: ['./kndl-call-to-action.component.scss']
})
export class KndlCallToActionComponent {
  @Input() editMode: boolean = false;
  @Output() dataChange = new EventEmitter<CallToActionContent>();

  // Editable content object
  @Input() content: CallToActionContent = {
    title: 'Ready to Build Your Brand?',
    description: 'Pixel & Post helps local businesses and solo founders launch fast, look credible, be found, and grow smart. Complete brand kits, high-converting websites, and ongoing digital marketing support—delivered with no agency fluff and real results.',
    buttonText: 'Start Your Project',
    styling: {
      hrWidth: '200px'
    }
  };

  constructor() {
    // Load content from localStorage if it exists
    this.loadContent();
  }

  // Emit content changes to parent component
  private emitContentChange(): void {
    this.dataChange.emit({ ...this.content });
  }

  // Method to handle any content change and emit to parent
  onContentChange(): void {
    this.emitContentChange();
  }

  // Load content from localStorage
  loadContent() {
    try {
      const savedContent = localStorage.getItem('call-to-action-content');
      if (savedContent) {
        this.content = JSON.parse(savedContent);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  }

  // Save content as JSON to localStorage
  saveContent() {
    try {
      const jsonContent = JSON.stringify(this.content, null, 2);
      localStorage.setItem('call-to-action-content', jsonContent);

      // Also create downloadable JSON file
      this.downloadJSON();

      // Emit changes to parent
      this.emitContentChange();

      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content');
    }
  }

  // Download content as JSON file
  downloadJSON() {
    const jsonContent = JSON.stringify(this.content, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-to-action-content.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  showContactForm() {
    alert('show contact form here')
  }
}
