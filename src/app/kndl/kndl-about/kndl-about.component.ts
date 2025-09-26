import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

export interface KndlAboutData {
  headerText: string;
}

@Component({
  selector: 'app-kndl-about',
  templateUrl: './kndl-about.component.html',
  styleUrls: ['./kndl-about.component.scss']
})
export class KndlAboutComponent implements OnInit {
  @Input() editMode: boolean = false;
  @Output() dataChange = new EventEmitter<KndlAboutData>();

  private _content: KndlAboutData | null = null;

  @Input()
  set content(value: KndlAboutData | null) {
    this._content = value;
    if (value) {
      this.headerText = value.headerText;
      console.log('KndlAboutComponent content updated:', value);
    }
  }

  get content(): KndlAboutData | null {
    return this._content;
  }

  isLoggingIn = localStorage.getItem('administrator') !== 'true';
  headerText: string = 'Brand + Web Studio. Real Results.';

  ngOnInit(): void {
    if (this.content) {
      console.log('KndlAboutComponent initialized');
      this.headerText = this.content.headerText;
      console.log('KndlAboutComponent initialized with content:', this.content);
    }
  }

  onHeaderTextChange(): void {
    this.emitDataChange();
  }

  private emitDataChange(): void {
    const data: KndlAboutData = {
      headerText: this.headerText
    };
    this.dataChange.emit(data);
  }
}
