import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminWikiListComponent } from './admin-wiki-list.component';

describe('AdminWikiListComponent', () => {
  let component: AdminWikiListComponent;
  let fixture: ComponentFixture<AdminWikiListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminWikiListComponent]
    });
    fixture = TestBed.createComponent(AdminWikiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
