import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import '../firebase-init'; // Initialize Firebase
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;

    // Don't call detectChanges() immediately to avoid Firebase auth check
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
