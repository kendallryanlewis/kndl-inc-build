import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericH2TitleComponent } from './generic-h2-title.component';

describe('GenericH2TitleComponent', () => {
  let component: GenericH2TitleComponent;
  let fixture: ComponentFixture<GenericH2TitleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GenericH2TitleComponent]
    });
    fixture = TestBed.createComponent(GenericH2TitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
