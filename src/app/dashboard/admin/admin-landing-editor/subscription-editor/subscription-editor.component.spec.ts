import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionEditorComponent } from './subscription-editor.component';

describe('SubscriptionEditorComponent', () => {
  let component: SubscriptionEditorComponent;
  let fixture: ComponentFixture<SubscriptionEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SubscriptionEditorComponent]
    });
    fixture = TestBed.createComponent(SubscriptionEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
