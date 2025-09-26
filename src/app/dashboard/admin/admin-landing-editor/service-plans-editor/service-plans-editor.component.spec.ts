import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicePlansEditorComponent } from './service-plans-editor.component';

describe('ServicePlansEditorComponent', () => {
  let component: ServicePlansEditorComponent;
  let fixture: ComponentFixture<ServicePlansEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ServicePlansEditorComponent]
    });
    fixture = TestBed.createComponent(ServicePlansEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
