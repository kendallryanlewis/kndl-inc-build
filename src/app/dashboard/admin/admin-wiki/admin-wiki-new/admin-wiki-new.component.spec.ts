import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminWikiNewComponent } from './admin-wiki-new.component';

describe('AdminWikiNewComponent', () => {
  let component: AdminWikiNewComponent;
  let fixture: ComponentFixture<AdminWikiNewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminWikiNewComponent]
    });
    fixture = TestBed.createComponent(AdminWikiNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
