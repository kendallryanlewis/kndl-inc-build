import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddonsEditorComponent } from './addons-editor.component';

describe('AddonsEditorComponent', () => {
  let component: AddonsEditorComponent;
  let fixture: ComponentFixture<AddonsEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddonsEditorComponent]
    });
    fixture = TestBed.createComponent(AddonsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
