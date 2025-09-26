import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallToActionEditorComponent } from './call-to-action-editor.component';

describe('CallToActionEditorComponent', () => {
  let component: CallToActionEditorComponent;
  let fixture: ComponentFixture<CallToActionEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CallToActionEditorComponent]
    });
    fixture = TestBed.createComponent(CallToActionEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
