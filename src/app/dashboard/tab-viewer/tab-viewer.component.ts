import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-tab-viewer',
  templateUrl: './tab-viewer.component.html'
})
export class TabViewerComponent implements AfterViewInit, OnChanges {
  @Input() selectedTab: string = '';
  @Input() subTab: string = '';
  @Output() childTabs = new EventEmitter<string[]>();
  @Output() selectedTabChange = new EventEmitter<any>();
  @Output() subTabChange = new EventEmitter<string>();


  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedTabChange']) {
      this.selectedTabChange.emit(this.subTab);
      console.log('selectedTabChange emitted:', this.subTab);
    }
  }

  onSetSubTab(id: string) {
    this.subTab = id;
    this.selectedTabChange.emit(this.subTab);
    this.subTabChange.emit(this.subTab);
  }

  setChildTabs(list: string[]) {
    // Emit empty array if no child tabs are passed
    this.childTabs.emit(list || []);
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

}
