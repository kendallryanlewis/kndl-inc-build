import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingEditorComponent } from './landing-editor.component';

describe('LandingEditorComponent', () => {
  let component: LandingEditorComponent;
  let fixture: ComponentFixture<LandingEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LandingEditorComponent]
    });
    fixture = TestBed.createComponent(LandingEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
